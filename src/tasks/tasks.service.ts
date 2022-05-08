import { CACHE_MANAGER, Inject, Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule'
import { Cache } from 'cache-manager'

import { DbService } from '../db/db.service'
import { LessonsService } from '../lessons/lessons.service'
import { LessonMetaData } from '../lessons/models/lessons.model'
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
    // 符合以下规则的用户
    // 今天有课 &&
    // (lessonNotificationSettings.needNotifications为true或者null) &&
    // ((lessonNotificationSettings.state为null或者failed) && (当前时间 - lessonNotificationSettings.lastNotified < 20小时)) &&
    // (lessonNotificationSettings.state为succeeded && (当前时间 - lessonNotificationSettings.lastNotified > 20小时))

    // 获取10个符合规则的用户的id 并标记lessonNotificationSettings.state为pendding
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const query = `
      query v($succeeded: string) {
        # 今天的日期
        metadata(func: type(LessonMetaData)) {
          week as week
          endYear as endYear
          startYear as startYear 
          semester as semester
        }
        # 所有默认被通知的用户(没有LessonNotificationSettings)
        users1_(func: type(User)) @filter(not has(LessonNotificationSettings)) { users1 as uid }
        # 所有主动允许通知的用户
        users2_(func: type(User)) {
          lessonNotificationSettings @filter(type(LessonNotificationSettings) and not eq(needNotifications, false)) {
            lastNotifiedAt as lastNotifiedAt

            # lastNotifiedAt 距今的小时数
            hours as math(since(lastNotifiedAt)/(60*60))
            ~lessonNotificationSettings {
              users2 as uid
            }
          } 
        }
        # 所有上次通知失败或者state为null的用户(当前时间 - lastNotifiedAt < 20小时)
        # TODO：考虑更改 20 小时为更好的时间
        users3_(func: uid(lessonSettings)) @filter((not has(state) or not eq(state, $succeeded)) and lt(val(hours), 20)) {
          ~lessonNotificationSettings {
            users3 as uid
          }
        }
        # 所有上次通知成功的用户(当前时间 - lastNotifiedAt > 20小时)
        users4_(func: uid(lessonSettings)) @filter(eq(state, $succeeded) and gt(val(hours), 20)) {
          ~lessonNotificationSettings {
            users4 as uid
          }
        }
        # 所有今天有课的用户(TODO: 对 lessonItem 中的 dayInWeek 进行筛选)
        users5_(func: type(Lesson)) @filter(eq(circle, val(week)) and eq(endYear, val(endYear)) and eq(startYear, val(startYear)) and eq(semester, val(semester))) {
          ~lessons {
            users5 as uid
          }
        }
        # 符合规则的用户
        users(func: type(User)) @filter(uid(users1) and uid(users2) and uid(users3, users4) and uid(users5)) {
          uid
        }
      }
    `
    // 并发发送通知
    // 获取发送成功的用户的id和发送失败的用户的id
    // 将发送成功的用户的lessonNotificationSettings.state改为succeeded，
    // lessonNotificationSettings.lastNotified改为今天08:00
    // 发送失败的用户的state改为failed
    // 函数退出
    this.logger.error('called every 10 seconds...')
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
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
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
