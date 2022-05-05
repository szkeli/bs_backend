import { Injectable } from '@nestjs/common'

import { BadOpenIdException, LessonNotFoundException, UserNotFoundException, UserNotHasLessonsTodayExcepton } from '../app.exception'
import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { Deadline } from '../deadlines/models/deadlines.model'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { getLessonNotificationTemplate, handleRelayForwardAfter, now, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { WxService } from '../wx/wx.service'
import { AddLessonArgs, FilterLessonsArgs, Lesson, LessonItem, LessonMetaData, LessonNotificationSettings, TriggerLessonNotificationArgs, UpdateLessonArgs, UpdateLessonMetaDataArgs, UpdateLessonNotificationSettingsArgs } from './models/lessons.model'

@Injectable()
export class LessonsService {
  constructor (
    private readonly dbService: DbService,
    private readonly wxService: WxService
  ) {}

  async updateLessonNotificationSettings (id: string, { needNotifications }: UpdateLessonNotificationSettingsArgs) {
    const query = `
      query v($id: string) {
        u(func: uid($id)) @filter(type(User)) {
          u as uid
          settings as lessonNotificationSettings @filter(type(LessonNotificationSettings))
        }
        settings(func: uid(settings)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const create = '@if( eq(len(u), 1) and eq(len(settings), 0) )'
    const createMutation = {
      uid: 'uid(u)',
      lessonNotificationSettings: {
        'dgraph.type': 'LessonNotificationSettings',
        uid: '_:settings',
        needNotifications,
        lastNotifiedAt: null
      }
    }

    const update = '@if( eq(len(u), 1) and eq(len(settings), 1) )'
    const updateMutation = {
      uid: 'uid(settings)',
      needNotifications
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      u: Array<{uid: string}>
      settings: LessonNotificationSettings[]
    }>({
      query,
      mutations: [
        { condition: create, mutation: createMutation },
        { condition: update, mutation: updateMutation }
      ],
      vars: { $id: id }
    })

    if (res.json.u.length === 0) {
      throw new UserNotFoundException(id)
    }

    if (res.json.settings[0]) {
      Object.assign(res.json.settings[0], { needNotifications })
      return res.json.settings[0]
    }

    return {
      needNotifications,
      lastNotifiedAt: null
    }
  }

  async lessonNotificationSettings (id: string) {
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(User)) {
          settings as lessonNotificationSettings @filter(type(LessonNotificationSettings))
        }
        settings(func: uid(settings)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{settings: LessonNotificationSettings[]}>({ query, vars: { $id: id } })

    return res.settings[0] ?? {
      needNotifications: true,
      lastNotifiedAt: null
    }
  }

  async lessonMetaData () {
    const query = `
      query {
        metadata(func: type(LessonMetaData)) {
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{metadata: LessonMetaData[]}>({ query, vars: {} })

    return res.metadata[0]
  }

  async updateLessonMetaData ({ startYear, endYear, semester, week }: UpdateLessonMetaDataArgs) {
    const query = `
      query {
        var(func: type(LessonMetaData)) {
          metadata as uid
        }
      }
    `
    const update = '@if( eq(len(metadata), 1) )'
    const updateMutation = {
      uid: 'uid(metadata)',
      startYear,
      endYear,
      semester,
      week
    }

    const create = '@if( eq(len(metadata), 0) )'
    const createMutation = {
      uid: '_:lessonMetaData',
      'dgraph.type': 'LessonMetaData',
      startYear,
      endYear,
      semester,
      week
    }

    await this.dbService.commitConditionalUperts({
      query,
      mutations: [
        { condition: update, mutation: updateMutation },
        { condition: create, mutation: createMutation }
      ],
      vars: {}
    })

    return {
      startYear, endYear, semester, week
    }
  }

  async filterLessons (id: string, { week, dayInWeek, startYear, endYear, semester }: FilterLessonsArgs) {
    const query = `
      query v($id: string) {
        user(func: uid($id)) @filter(type(User)) {
          lessons @filter(type(Lesson) and eq(circle, ${week}) and eq(startYear, ${startYear}) and eq(endYear, ${endYear}) and eq(semester, ${semester})) {
            items as lessonItems @filter(type(LessonItem) and eq(dayInWeek, ${dayInWeek}) and eq(circle, ${week}))
          }
          openId
        }
        items(func: uid(items)) {
          expand(_all_)
          lesson: ~lessonItems {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    return await this.dbService.commitQuery<{
      items: Array<LessonItem & { lesson: Lesson[] }>
      user: Array<{ openId: string }>
    }>({
      query, vars: { $id: id }
    })
  }

  async deadlines (id: string, { first, after, orderBy }: RelayPagingConfigArgs) {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.deadlinesRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async deadlinesRelayForward (id: string, first: number, after: string) {
    const q1 = 'var(func: uid(deadlines), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(Lesson)) {
          deadlines as deadlines (orderdesc: createdAt) @filter(type(Deadline))
        }
        ${after ? q1 : ''}
        totalCount(func: uid(deadlines)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'deadlines'}), orderdesc: createdAt, first: ${first}) { 
          id: uid
          expand(_all_)
        }
        # 开始游标
        startO(func: uid(deadlines), first: -1) { createdAt }
        # 结束游标
        endO(func: uid(deadlines), first: 1) { createdAt } 
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Deadline>>({ query, vars: { $id: id, $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async lesson (id: string) {
    const query = `
    query v($id: string) {
      lesson (func: uid($id)) @filter(type(Lesson)) {
        id: uid
        expand(_all_)
      }
    }
  `
    const res = await this.dbService.commitQuery<{lesson: Lesson[]}>({ query, vars: { $id: id } })
    if (res.lesson.length !== 1) {
      throw new LessonNotFoundException(id)
    }
    return res.lesson[0]
  }

  async lessons ({ first, after, orderBy }: RelayPagingConfigArgs) {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.lessonsFRelayForward(first, after)
    }
    throw new Error('Method not implemented.')
  }

  async lessonsFRelayForward (first: number, after: string) {
    const q1 = 'var(func: uid(lessons), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($after: string) {
          lessons as var(func: type(Lesson), orderdesc: createdAt)
          ${after ? q1 : ''}
          totalCount(func: uid(lessons)) { count(uid) }
          objs(func: uid(${after ? 'q' : 'lessons'}), orderdesc: createdAt, first: ${first}) {
            id: uid
            expand(_all_) {
              expand(_all_)
            }
          }
          # 开始游标
          startO(func: uid(lessons), first: -1) { createdAt }
          # 结束游标
          endO(func: uid(lessons), first: 1) { createdAt } 
        }
      `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Lesson>>({ query, vars: { $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async updateLesson (id: string, args: UpdateLessonArgs) {
    throw new Error('Method not implemented.')
  }

  /**
   * 将当前用户添加到对应的课程中；
   * 课程不存在时，根据课程号创建课程对象，
   * @param id 用户id
   * @param args props
   * @returns {Promise<Lesson>}
   */
  async addLesson (id: string, args: AddLessonArgs): Promise<Lesson> {
    const query = `
      query v($id: string, $lessonId: string) {
          # 当前用户是否存在
          v(func: uid($id)) @filter(type(User)) { v as uid }
          # 当前用户是否已经添加了该课程
          q(func: uid(v)) {
              lessons @filter(type(Lesson) and eq(lessonId, $lessonId)) {
                  q as uid
              }
          }
      }
    `
    const lessonItems = args.lessonItems.map((item, index) => ({
      uid: `_:lessonItem_${index}`,
      'dgraph.type': 'LessonItem',
      start: item.start,
      end: item.end,
      dayInWeek: item.dayInWeek,
      circle: item.circle,
      description: item.description,
      destination: item.destination
    }))

    const create = '@if( eq(len(v), 1) and eq(len(q), 0) )'
    const createMutation = {
      uid: 'uid(v)',
      lessons: {
        // 课程内部id
        uid: '_:lesson',
        'dgraph.type': 'Lesson',
        // 课程的创建时间
        createdAt: now(),
        // 课程的名字
        name: args.name,
        // 上课地点
        destination: args.destination,
        // 课程描述
        description: args.description,
        // 要上课的周的数组
        circle: args.circle,
        // 课程的id
        lessonId: args.lessonId,
        // 授课教师名字
        educatorName: args.educatorName,
        // 开始学年
        startYear: args.startYear,
        endYear: args.endYear,
        semester: args.semester,
        color: args.color,
        lessonItems
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      q: Array<{lessons: Array<{uid: string}>}>
    }>({
      query,
      mutations: [{ mutation: createMutation, condition: create }],
      vars: { $id: id, $lessonId: args.lessonId }
    })

    if (res.json.v.length !== 1) {
      throw new UserNotFoundException(id)
    }

    const _id = res.uids?.get('lesson') ?? res.json.q[0]?.lessons[0]?.uid
    return {
      id: _id,
      ...args,
      createdAt: now()
    }
  }

  async triggerLessonNotification ({ to, startYear, endYear, semester, week, dayInWeek }: TriggerLessonNotificationArgs) {
    // 通过 to 查询相应用户的 openId
    const res = await this.filterLessons(to, {
      week,
      dayInWeek,
      startYear,
      endYear,
      semester
    })

    if (res.user.length === 0) {
      throw new UserNotFoundException(to)
    }

    if (res.items.length === 0) {
      throw new UserNotHasLessonsTodayExcepton(to)
    }

    if (!res.user[0]?.openId || res.user[0]?.openId === '') {
      throw new BadOpenIdException(to)
    }

    const template = getLessonNotificationTemplate(res.user[0]?.openId, res.items)
    return await this.wxService.sendUniformMessage(template)
  }
}
