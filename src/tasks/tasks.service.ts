import { CACHE_MANAGER, Inject, Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule'
import { Cache } from 'cache-manager'

import { DbService } from '../db/db.service'
import { LessonsService } from '../lessons/lessons.service'
import { LESSON_NOTIFY_STATE, LessonMetaData } from '../lessons/models/lessons.model'
import { ids2String, now } from '../tool'

@Injectable()
export class TasksService {
  constructor (
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly dbService: DbService,
    private readonly lessonsService: LessonsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  private readonly logger = new Logger(TasksService.name)

  // 每10秒执行的任务
  // @Cron(CronExpression.EVERY_10_SECONDS, {
  //   name: 'lessonNotificationJob'
  // })
  async triggerExery10Seconds (taskType: TaskType) {
    const res = await this.getAndPendding()

    const res2 = await this.sendNotification(res)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const res3 = await this.tagThem(res, res2 as any)

    // 获取发送成功的用户的id和发送失败的用户的id
    // 将发送成功的用户的lessonNotificationSettings.state改为succeeded，
    // lessonNotificationSettings.lastNotified改为今天08:00
    // 发送失败的用户的state改为failed
    // 函数退出
    this.logger.error('called every 10 seconds...')
  }

  async tagThem (res: NotificationTaskArgs, res2: Array<{status: string, value: any}>) {
    const ids = []
    res2.forEach((i, index) => {
      if (i.status === 'fulfilled') {
        ids.push(res[index])
      }
    })
    const idsString = ids2String(ids)
    const query = `
      query {
        users(func: uid(${idsString})) @filter(type(User)) {
          users as uid
        }
      }
    `
    const condition = `@if( eq(len(users), ${ids.length}) )`
    const mutation = {
      uid: 'uid(users)',
      lessonNotificationSettings: {
        'dgraph.type': 'LessonNotificationSettings',
        state: LESSON_NOTIFY_STATE.SUCCEEDED,
        lastNotifiedAt: now()
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const res222 = await this.dbService.commitConditionalUperts({
      query,
      mutations: [{ condition, mutation }],
      vars: {}
    })
  }

  async getAndPendding () {
    // 符合以下规则的用户
    // 今天有课 &&
    // (lessonNotificationSettings.needNotifications为true或者null) &&
    // ((lessonNotificationSettings.state为null或者failed) && (当前时间 - lessonNotificationSettings.lastNotified < 20小时)) &&
    // (lessonNotificationSettings.state为succeeded && (当前时间 - lessonNotificationSettings.lastNotified > 20小时))

    // 获取10个符合规则的用户的id 并标记lessonNotificationSettings.state为pendding
    const query = `
      query v($succeeded: string, $failed: string, $pendding: string) {
        # 今天的日期
        metadata(func: type(LessonMetaData)) {
          week as week
          endYear as endYear
          startYear as startYear 
          semester as semester
          a: day as dayInWeek
          dayInWeek: dayInWeek as math(day + 2)
        }
        # 所有默认被通知的用户(没有LessonNotificationSettings)
        var(func: type(User)) @filter(not has(lessonNotificationSettings)) { users1 as uid }
        # 所有主动允许通知的用户
        var(func: type(User)) {
          lessonNotificationSettings as lessonNotificationSettings @filter(type(LessonNotificationSettings) and not eq(needNotifications, false) ) {
            lastNotifiedAt as lastNotifiedAt

            # lastNotifiedAt 距今的小时数
            hours as math(since(lastNotifiedAt)/(60*60))
            ~lessonNotificationSettings {
              users2 as uid
            }
          } 
        }
        # 所有上次通知失败或者state为null的用户(当前时间 - lastNotifiedAt < 20小时)
        var(func: uid(lessonNotificationSettings)) @filter((not has(state) or eq(state, $failed)) and (lt(val(hours), 20) or not has(lastNotifiedAt))) {
          ~lessonNotificationSettings {
            users3 as uid
          }
        }
        # 所有上次通知成功的用户(当前时间 - lastNotifiedAt > 20小时)
        var(func: uid(lessonNotificationSettings)) @filter(eq(state, $succeeded) and (gt(val(hours), 20) or not has(lastNotifiedAt))) {
          ~lessonNotificationSettings {
            users4 as uid
          }
        }
        # 所有今天有课的用户
        var(func: type(LessonItem)) @filter(eq(circle, val(week)) and eq(dayInWeek, val(dayInWeek))) {
          ~lessonItems @filter(eq(endYear, val(endYear)) and eq(startYear, val(startYear)) and eq(semester, val(semester))) {
            ~lessons @filter(type(User)) {
              users5 as uid
            }
          }
        }
        users1(func: uid(users1)) {
          uid
        }
        users2(func:uid(users2)) {
            uid
        }
        users3(func: uid(users3)) {
            uid
        }
        users4(func: uid(users4)) {
            uid
        }
        users5(func: uid(users5)) {
            uid
        }
        # 符合规则的用户
        users(func: type(User)) @filter(uid(users1, users2) and uid(users1, users3, users4) and uid(users1, users5))  {
          valiedUser as uid
        }
        valiedUser(func: uid(valiedUser), orderdesc: createdAt, first: 10) {
          payload as id: uid
        }
      }
    `
    // pendding 待通知的用户
    const condition = '@if( not eq(len(payload), 0) )'
    const mutation = {
      uid: 'uid(payload)',
      lessonNotificationSettings: {
        'dgraph.type': 'LessonNotificationSettings',
        state: LESSON_NOTIFY_STATE.PENDDING
      }
    }
    return await this.dbService.commitConditionalUperts({
      query,
      mutations: [{ condition, mutation }],
      vars: {
        $succeeded: LESSON_NOTIFY_STATE.SUCCEEDED,
        $failed: LESSON_NOTIFY_STATE.FAILED,
        $pendding: LESSON_NOTIFY_STATE.PENDDING
      }
    }) as NotificationTaskArgs
  }

  async sendNotification (args: NotificationTaskArgs) {
    // 并发发送通知
    const { week, dayInWeek, startYear, endYear, semester } = args.json.metadata[0]

    console.error(args.json.metadata[0])
    const dd = [{ id: '0x2bcb' }, { id: '0x2bcb' }]

    // eslint-disable-next-line @typescript-eslint/promise-function-async
    return await Promise.allSettled(dd.map(({ id }) => {
      return this.lessonsService.triggerLessonNotification({
        to: id, week, dayInWeek, startYear, endYear, semester
      })
    }))
  }

  // 每天早上8点的任务
  // @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async triggerEveryDayAt8AM () {
    this.logger.debug('called at every day on 8 AM...')
  }

  // 每天晚上10点的任务
  // @Cron(CronExpression.EVERY_DAY_AT_10PM)
  async triggerEveryDayAt10PM () {
    this.logger.debug('called at every day on 10 PM...')
  }

  // 每天更新LessonMetaData
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Asia/Shanghai'
  })
  async triggerEveryDayAtMinight () {
    const query = `
      query {
        metadata(func: type(LessonMetaData)) {
          metadata as id: uid
          week as week
          dayInWeek as dayInWeek
          weekPlushOne as math(week + 1)
          dayInWeekPlushOne as math(dayInWeek + 1)
        }
        var(func: uid(metadata)) @filter(lt(val(dayInWeek), 7)) {
          l as uid
          val(weekPlushOne)
        }
        var(func: uid(metadata)) @filter(eq(val(dayInWeek), 7)) {
          e as uid
          val(dayInWeekPlushOne)
        }
      }
    `
    const plushDayInWeekCond = '@if( eq(len(metadata), 1) and eq(len(l), 1) )'
    const plushDayInWeekMutation = {
      uid: 'uid(metadata)',
      dayInWeek: 'val(dayInWeekPlushOne)'
    }

    const plushWeekCond = '@if( eq(len(metadata), 1) and eq(len(e), 1) )'
    const plushWeekMutation = {
      uid: 'uid(metadata)',
      dayInWeek: 1,
      week: 'val(weekPlushOne)'
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      metadata: LessonMetaData[]
    }>({
      query,
      mutations: [
        { condition: plushDayInWeekCond, mutation: plushDayInWeekMutation },
        { condition: plushWeekCond, mutation: plushWeekMutation }
      ],
      vars: {}
    })

    if (res.json.metadata.length !== 1) {
      this.logger.error(`LessonMetaData 长度 ${res.json.metadata.length} 不为 1`)
    }
  }
}

enum TaskType {
  // 早上8点的通知
  gm = 'gm',
  // 晚上10点的通知
  gf = 'gf'
}

interface NotificationTaskArgs {
  uids: Map<string, string>
  json: {
    metadata: LessonMetaData[]
    users1: Array<{
      uid: string
    }>
    users2: Array<{
      uid: string
    }>
    users3: Array<{
      uid: string
    }>
    users4: Array<{
      uid: string
    }>
    users5: Array<{
      uid: string
    }>
    valiedUser: Array<{
      id: string
    }>
  }
}
