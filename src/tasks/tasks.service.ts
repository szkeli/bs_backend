import { CACHE_MANAGER, Inject, Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule'
import { Cache } from 'cache-manager'

@Injectable()
export class TasksService {
  constructor (
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  private readonly logger = new Logger(TasksService.name)

  // 每10秒执行的任务
  @Cron(CronExpression.EVERY_10_SECONDS, {
    name: 'lessonNotificationJob'
  })
  async triggerExery10Seconds (taskType: TaskType) {
    // 符合以下规则的用户
    // 今天有课 &&
    // lessonNotificationSettings.needNotifications为true或者null &&
    // ((lessonNotificationSettings.state为null或者failed) && (当前时间 - lessonNotificationSettings.lastNotified < 20小时)) &&
    // ((lessonNotificationSettings.state为succeeded，))
    // 获取10个符合规则的用户的id 并标记lessonNotificationSettings.state为pendding
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const query = `
      query {
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
          # (TODO 计算 state 和 lastNotified 距今时间)
          lessonNotificationSettings @filter(type(LessonNotificationSettings) and not eq(needNotifications, false)) {
            ~lessonNotificationSettings {
              users2 as uid
            }
          } 
        }
        # 所有今天有课的用户
        var(func: type(User)) {
          users as uid
          c as count(lessons @filter(type(Lesson) and eq(circle, val(week)) and eq(endYear, val(endYear)) and eq(startYear, val(startYear)) and eq(semester, val(semester)))) 
        }
        users3_(func: uid(users)) @filter(not eq(val(c), 0)) {
          users3 as uid
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
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async triggerEveryDayAt8AM () {
    this.logger.debug('called at every day on 8 AM...')
  }

  // 每天晚上10点的任务
  @Cron(CronExpression.EVERY_DAY_AT_10PM)
  async triggerEveryDayAt10PM () {
    this.logger.debug('called at every day on 10 PM...')
  }
}

enum TaskType {
  // 早上8点的通知
  gm = 'gm',
  // 晚上10点的通知
  gf = 'gf'
}
