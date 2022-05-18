import { CACHE_MANAGER, Inject, Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule'
import { Cache } from 'cache-manager'
import { CronJob } from 'cron'

import { LESSON_NOTIFY_JOB_NAME } from '../constants'
import { DbService } from '../db/db.service'
import { LessonsService } from '../lessons/lessons.service'
import { LESSON_NOTIFY_STATE, LessonMetaData } from '../lessons/models/lessons.model'
import { ids2String, now, sleep } from '../tool'
import { TASK_TYPE } from './models/tasks.model'

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name)
  constructor (
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly dbService: DbService,
    private readonly lessonsService: LessonsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  async test () {
    const query = `
      query {
        var(func: type(User)) {
          users as uid
        }
        users(func: uid(users)) {
          id: uid
          status as lessonNotificationStatus @filter(type(LessonNotificationStatus))
        }
      }
    `
    const mutation = {
      uid: 'uid(status)',
      'dgraph.type': 'LessonNotificationStatus',
      lastNotifiedAt: now(),
      state: LESSON_NOTIFY_STATE.FAILED
    }
    const condition = '@if( not eq(len(users), 0) )'

    const res = await this.dbService.commitConditionalUperts({
      query,
      mutations: [{ mutation, condition }],
      vars: {}
    })
    console.error(res)
  }

  async testTr () {
    await this.triggerEveryDayAt10PM()
    // await this.triggerEveryDayAt8AM()
    return 'success'
  }

  // 每天早上8点的任务
  @Cron(CronExpression.EVERY_DAY_AT_8AM, {
    timeZone: 'Asia/Shanghai'
  })
  async triggerEveryDayAt8AM () {
    const cron = this.schedulerRegistry.getCronJobs()
    for (const [i, j] of cron) {
      if (i === LESSON_NOTIFY_JOB_NAME) {
        j.start()
        return
      }
    }

    const job = new CronJob(
      CronExpression.EVERY_10_SECONDS,
      async () => await this.triggerExery10Seconds(TASK_TYPE.GM)
    )

    this.schedulerRegistry
      .addCronJob(LESSON_NOTIFY_JOB_NAME, job)
    job.start()

    this.logger.debug('called at every day on 8 AM...')
  }

  // 每天晚上10点的任务
  @Cron(CronExpression.EVERY_DAY_AT_10PM, {
    timeZone: 'Asia/Shanghai'
  })
  async triggerEveryDayAt10PM () {
    const cron = this.schedulerRegistry.getCronJobs()
    for (const [i, j] of cron) {
      if (i === LESSON_NOTIFY_JOB_NAME) {
        j.start()
        return
      }
    }

    const job = new CronJob(
      CronExpression.EVERY_10_SECONDS,
      async () => await this.triggerExery10Seconds(TASK_TYPE.GF)
    )

    this.schedulerRegistry
      .addCronJob(LESSON_NOTIFY_JOB_NAME, job)
    job.start()

    this.logger.debug('called at every day on 10 PM...')
  }

  async triggerExery10Seconds (taskType: TASK_TYPE) {
    const res = await this.getAndPendding(taskType)

    this.logger.debug(`totalCount: ${res.json.totalCount[0]?.count ?? 0}, ` + 'valiedUser: ' + res.json.valiedUser.map(i => i.id).toString())
    if (res.json.valiedUser.length === 0) {
      this.logger.debug('schdulerStopped')
      this.schedulerRegistry
        .getCronJob(LESSON_NOTIFY_JOB_NAME)
        .stop()
    }

    const res2 = await this.sendNotification(res, taskType)
    // const res2 = await this.mockSendNotification(res, taskType)
    await this.tagThem(res, res2 as any)

    this.logger.debug('called every 10 seconds...')
  }

  async tagThem (res: NotificationTaskArgs, res2: Array<{status: string, value: any}>) {
    const succeededIds = []
    const failedIds = []

    res2.forEach((i, index) => {
      if (i.status === 'fulfilled') {
        succeededIds.push(res.json.valiedUser[index].id)
      }
      if (i.status === 'rejected') {
        failedIds.push(res.json.valiedUser[index].id)
      }
    })
    const succeededIdsString = ids2String(succeededIds)
    const failedIdsString = ids2String(failedIds)

    this.logger.debug('succeededIds: ' + succeededIdsString)
    this.logger.debug('failedIds: ' + failedIdsString)
    const query = `
      query {
        succeeded(func: uid(${succeededIdsString})) @filter(type(User)) {
          succeededs as uid
          sstatus as lessonNotificationStatus @filter(type(LessonNotificationStatus))
        }
        failed(func: uid(${failedIdsString})) @filter(type(User)) {
          faileds as uid
          fstatus as lessonNotificationStatus @filter(type(LessonNotificationStatus))
        }
      }
    `
    const succeededCond = `@if( eq(len(succeededs), ${succeededIds.length}) )`
    const succeededMutation = {
      uid: 'uid(sstatus)',
      'dgraph.type': 'LessonNotificationStatus',
      state: LESSON_NOTIFY_STATE.SUCCEEDED,
      lastNotifiedAt: now()
    }

    const failedCond = `@if( eq(len(faileds), ${failedIds.length}) )`
    const failedMutation = {
      uid: 'uid(fstatus)',
      'dgraph.type': 'LessonNotificationStatus',
      state: LESSON_NOTIFY_STATE.FAILED,
      lastNotifiedAt: now()
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return await this.dbService.commitConditionalUperts({
      query,
      mutations: [
        { condition: succeededCond, mutation: succeededMutation },
        { condition: failedCond, mutation: failedMutation }
      ],
      vars: {}
    })
  }

  async getAndPendding (taskType: TASK_TYPE) {
    // 一次性通知的用户个数
    const PATCH_USER_COUNT_MAX = 20 // 3
    // 距离上一次失败通知多久的用户为有效用户
    const LAST_NOTIFY_FAILED_S = 20 * 60 // 18 * 60 * 60
    // 距离上一次成功通知多久的用户为有效用户
    const LAST_NOTIFY_SUCCEEDED_S = 20 * 60 // 18 * 60 * 60
    // 处于 PENDDING 有效期内不会重新发送通知
    const PENDDING_VAILED_TIME_S = 5 * 60
    // 处于 FAILED 有效期内会重新发送通知
    const FAILED_VAILED_TIME_S = 5 * 60

    const metadataTemplate = taskType === TASK_TYPE.GM
      ? `
      metadata(func: type(LessonMetaData)) {
        startYear as startYear 
        endYear as endYear
        semester as semester
        week as week
        dayInWeek as dayInWeek
      }
    `
      : `
      metadata(func: type(LessonMetaData)) {
        startYear as startYear 
        endYear as endYear
        semester as semester
        oldWeek: oldWeek as week
        oldDayInWeek: oldDayInWeek as dayInWeek

        week: week as math(cond(oldDayInWeek == 7, oldWeek + 1, oldWeek))
        dayInWeek: dayInWeek as math(cond(oldDayInWeek == 7, 1, oldDayInWeek + 1))
      }
      `
    const query = `
      query v($succeeded: string, $failed: string, $pendding: string) {
        # 今天的日期
        ${metadataTemplate}
        var(func: type(User)) {
          status as lessonNotificationStatus @filter(type(LessonNotificationStatus)) {
            lastNotifiedAt as lastNotifiedAt
            # lastNotifiedAt 距今的秒数
            secounds as math(since(lastNotifiedAt))
          }
        }
        # 1. 所有默认被通知的用户 (not has(LessonNotificationSettings) && type(lessonNotificationSettings) != LessonNotificationSettings)
        var(func: type(User)) @filter(not has(lessonNotificationSettings)) {
          users1 as uid 
        }
        # 2. 所有主动允许通知的用户
        var(func: type(User)) {
          lessonNotificationSettings @filter(type(LessonNotificationSettings) and (eq(needNotifications, true) or not has(needNotifications)) ) {
            ~lessonNotificationSettings @filter(type(User)) {
              users2 as uid
            }
          } 
        }
        # 3. 所有今天有课的用户
        var(func: type(LessonItem)) @filter(eq(circle, val(week)) and eq(dayInWeek, val(dayInWeek))) {
          ~lessonItems @filter(eq(endYear, val(endYear)) and eq(startYear, val(startYear)) and eq(semester, val(semester))) {
            ~lessons @filter(type(User)) {
              users3 as uid
            }
          }
        }
        # 4. 所有没有 LessonNotificationStatus 的用户
        var(func: type(User)) @filter(not has(lessonNotificationStatus)) {
          users4 as uid
        }
        # 5. 所有18小时前通知失败的用户(当前时间 - lastNotifiedAt < 18h)
        var(func: uid(status)) @filter((eq(state, $failed)) and gt(val(secounds), ${LAST_NOTIFY_FAILED_S})) {
          ~lessonNotificationStatus @filter(type(User)) {
            users5 as uid
          }
        }
        # 6. 所有18小时前通知成功的用户(当前时间 - lastNotifiedAt > 18小时) (TODO)
        var(func: uid(status)) @filter(eq(state, $succeeded) and gt(val(secounds), ${LAST_NOTIFY_SUCCEEDED_S})) {
          ~lessonNotificationStatus @filter(type(User)) {
            users6 as uid
          }
        }
        # 7. 所有 PENDDING 超过 5min 的用户
        var(func: uid(status)) @filter(eq(state, $pendding) and gt(val(secounds), ${PENDDING_VAILED_TIME_S})) {
          ~lessonNotificationStatus @filter(type(User)) {
            users7 as uid
          }
        }
        # 8. 所有 10min 内通知失败的用户，重新发起通知
        var(func: uid(status)) @filter(eq(state, $failed) and lt(val(secounds), ${FAILED_VAILED_TIME_S})) {
          ~lessonNotificationStatus @filter(type(User)) {
            users8 as uid
          }
        }
        # 9. (默认被通知 || 主动允许被通知的用户) && 今天有课的用户
        var(func: type(User)) @filter(uid(users1, users2) and uid(users3)) {
          users9 as uid
        }

        # 符合规则的用户
        var(func: uid(users9)) @filter(uid(users4, users5, users6, users7, users8)) {
          users10 as uid
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
        users6(func: uid(users6)) {
          uid
        }
        users7(func: uid(users7)) {
          uid
        }
        users8(func: uid(users8)) {
          uid
        }
        users9(func: uid(users9)) {
          uid
        }
        users10(func: uid(users10)) {
          uid
        }
        
        totalCount(func: uid(users10)) {
          count(uid)
        }
        valiedUser(func: uid(users10), orderdesc: createdAt, first: ${PATCH_USER_COUNT_MAX}) {
          payload as id: uid
          lstatus as lessonNotificationStatus
        }
      }
    `
    // pendding 待通知的用户
    const condition = '@if( not eq(len(payload), 0) and not eq(len(lstatus), 0) )'
    const mutation = {
      uid: 'uid(lstatus)',
      'dgraph.type': 'LessonNotificationStatus',
      state: LESSON_NOTIFY_STATE.PENDDING,
      lastNotifiedAt: now()
    }

    return await this.dbService.commitConditionalUperts({
      query,
      mutations: [{ condition, mutation }],
      vars: {
        $failed: LESSON_NOTIFY_STATE.FAILED,
        $pendding: LESSON_NOTIFY_STATE.PENDDING,
        $succeeded: LESSON_NOTIFY_STATE.SUCCEEDED
      }
    }) as NotificationTaskArgs
  }

  async sendNotification (args: NotificationTaskArgs, taskType: TASK_TYPE) {
    const { week, dayInWeek, startYear, endYear, semester } = args.json.metadata[0]

    // eslint-disable-next-line @typescript-eslint/promise-function-async
    return await Promise.allSettled(args.json.valiedUser.map(({ id }) => {
      return this.lessonsService.triggerLessonNotification({
        to: id, week, dayInWeek, startYear, endYear, semester, taskType
      })
    }))
  }

  async mockSendNotification (args: NotificationTaskArgs, taskType: TASK_TYPE) {
    const { week, dayInWeek, startYear, endYear, semester } = args.json.metadata[0]

    console.error(args.json.metadata[0])

    const t = 0 * 1000

    this.logger.debug(`mockSendNotification: sleepping ${t}ms...`)

    await sleep(t)

    // eslint-disable-next-line @typescript-eslint/promise-function-async
    return await Promise.allSettled(args.json.valiedUser.map(({ id }) => {
      return this.lessonsService.mockTriggerLessonNotification({
        to: id, week, dayInWeek, startYear, endYear, semester, taskType
      })
    }))
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
    totalCount: Array<{
      count: number
    }>
  }
}
