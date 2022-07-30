import { Injectable, Logger } from '@nestjs/common'

import {
  LessonNotFoundException,
  SystemErrorException,
  UserNotFoundException,
  UserNotHasTheLesson
} from '../app.exception'
import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { Deadline } from '../deadlines/models/deadlines.model'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import {
  handleRelayForwardAfter,
  now,
  relayfyArrayForward,
  RelayfyArrayParam
} from '../tool'
import { CODE2SESSION_GRANT_TYPE, User } from '../user/models/user.model'
import { WxService } from '../wx/wx.service'
import {
  AddLessonArgs,
  Lesson,
  LESSON_NOTIFY_STATE,
  LessonMetaData,
  LessonNotificationSettings,
  UpdateLessonArgs,
  UpdateLessonMetaDataArgs,
  UpdateLessonNotificationSettingsArgs
} from './models/lessons.model'

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name)

  constructor (
    private readonly dbService: DbService,
    private readonly wxService: WxService
  ) {}

  async setLessonNotificationStatus () {
    const query = `
      query v() {
        var(func: type(User)) @filter(not has(lessonNotificationStatus)) {
          users as uid
        }
        users(func: uid(users)) {
          id: uid
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      users: Array<{ id: string }>
    }>({ query })

    const mutation = res.users.map(({ id }, index) => {
      return {
        mutation: {
          uid: id,
          lessonNotificationStatus: {
            uid: `_:status_${index}`,
            'dgraph.type': 'LessonNotificationStatus',
            state: LESSON_NOTIFY_STATE.FAILED,
            lastNotifiedAt: now()
          }
        },
        condition: '@if( not eq(len(users), 0) )'
      }
    })

    await this.dbService.commitConditionalUperts({
      query,
      mutations: mutation,
      vars: {}
    })

    return 'success'
  }

  async deleteLesson (user: User, lessonId: string) {
    const { id } = user

    const query = `
      query v($id: string, $lessonId: string) {
        u(func: uid($id))  {
          u as uid
        }
        # 当前用户是否拥有该课程
        var(func: uid(u)) {
          lessons @filter(type(Lesson) and eq(lessonId, $lessonId)) {
            q as uid
          }
        }
        q(func: uid(q)) {
          uid
        }
      }
    `
    const condition = '@if( eq(len(u), 1) and gt(len(q), 0) )'
    const mutation = {
      uid: 'uid(q)'
    }

    const del = {
      uid: 'uid(u)',
      lessons: {
        uid: 'uid(q)'
      }
    }

    const res = await this.dbService.commitMutation<
    Map<string, string>,
    {
      u: Array<{ uid: string }>
      q: Array<{ uid: string }>
    }
    >({
      query,
      mutations: [
        { cond: condition, del: mutation },
        { cond: condition, del }
      ],
      vars: { $id: id, $lessonId: lessonId }
    })

    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (res.json.q.length === 0) {
      throw new UserNotHasTheLesson(id, lessonId)
    }

    return true
  }

  async updateLessonNotificationSettings (
    id: string,
    { needNotifications }: UpdateLessonNotificationSettingsArgs
  ): Promise<LessonNotificationSettings> {
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
        needNotifications
      }
    }

    const update = '@if( eq(len(u), 1) and eq(len(settings), 1) )'
    const updateMutation = {
      uid: 'uid(settings)',
      needNotifications
    }

    const res = await this.dbService.commitConditionalUperts<
    Map<string, string>,
    {
      u: Array<{ uid: string }>
      settings: LessonNotificationSettings[]
    }
    >({
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
      needNotifications
    }
  }

  async lessonNotificationSettings (
    id: string
  ): Promise<LessonNotificationSettings> {
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
    const res = await this.dbService.commitQuery<{
      settings: LessonNotificationSettings[]
    }>({ query, vars: { $id: id } })

    return (
      res.settings[0] ?? {
        needNotifications: true
      }
    )
  }

  async lessonMetaData (): Promise<LessonMetaData> {
    const query = `
      query {
        metadata(func: type(LessonMetaData)) {
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      metadata: LessonMetaData[]
    }>({ query, vars: {} })

    return res.metadata[0]
  }

  async updateLessonMetaData ({
    startYear,
    endYear,
    semester,
    week,
    dayInWeek
  }: UpdateLessonMetaDataArgs): Promise<LessonMetaData> {
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
      week,
      dayInWeek
    }

    const create = '@if( eq(len(metadata), 0) )'
    const createMutation = {
      uid: '_:lessonMetaData',
      'dgraph.type': 'LessonMetaData',
      startYear,
      endYear,
      semester,
      week,
      dayInWeek
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
      startYear,
      endYear,
      semester,
      week,
      dayInWeek
    }
  }

  // async filterLessons (
  //   id: string,
  //   { week, dayInWeek, startYear, endYear, semester }: FilterLessonsArgs
  // ) {
  //   const query = `
  //     query v($id: string) {
  //       user(func: uid($id)) @filter(type(User)) {
  //         lessons @filter(type(Lesson) and eq(startYear, ${startYear}) and eq(endYear, ${endYear}) and eq(semester, ${semester})) {
  //           items as lessonItems @filter(type(LessonItem) and eq(dayInWeek, ${dayInWeek}) and eq(circle, ${week}))
  //         }
  //         openId
  //         blankspaceOpenId
  //         blankspaceAssistantOpenId
  //       }
  //       items(func: uid(items)) {
  //         expand(_all_)
  //         lesson: ~lessonItems {
  //           id: uid
  //           expand(_all_)
  //         }
  //       }
  //     }
  //   `
  //   return await this.dbService.commitQuery<{
  //     items: Array<LessonItem & { lesson: Lesson[] }>
  //     user: Array<{
  //       openId: string
  //       blankspaceOpenId: string
  //       blankspaceAssistantOpenId: string
  //     }>
  //   }>({
  //     query,
  //     vars: { $id: id }
  //   })
  // }

  async deadlines (
    id: string,
    { first, after, orderBy }: RelayPagingConfigArgs
  ) {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.deadlinesRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async deadlinesRelayForward (id: string, first: number, after: string | null) {
    const q1 =
      'var(func: uid(deadlines), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(Lesson)) {
          deadlines as deadlines (orderdesc: createdAt) @filter(type(Deadline))
        }
        ${after ? q1 : ''}
        totalCount(func: uid(deadlines)) { count(uid) }
        objs(func: uid(${
          after ? 'q' : 'deadlines'
        }), orderdesc: createdAt, first: ${first}) { 
          id: uid
          expand(_all_)
        }
        # 开始游标
        startO(func: uid(deadlines), first: -1) { createdAt }
        # 结束游标
        endO(func: uid(deadlines), first: 1) { createdAt } 
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Deadline>>({
      query,
      vars: { $id: id, $after: after }
    })

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
    const res = await this.dbService.commitQuery<{ lesson: Lesson[] }>({
      query,
      vars: { $id: id }
    })
    if (res.lesson.length !== 1) {
      throw new LessonNotFoundException(id)
    }
    return res.lesson[0]
  }

  async lessons ({ first, after, orderBy }: RelayPagingConfigArgs) {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.lessonsRelayForward(first, after)
    }
    throw new Error('Method not implemented.')
  }

  async lessonsRelayForward (first: number, after: string | null) {
    const q1 =
      'var(func: uid(lessons), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($after: string) {
          lessons as var(func: type(Lesson), orderdesc: createdAt)
          ${after ? q1 : ''}
          totalCount(func: uid(lessons)) { count(uid) }
          objs(func: uid(${
            after ? 'q' : 'lessons'
          }), orderdesc: createdAt, first: ${first}) {
            id: uid
            expand(_all_)
          }
          # 开始游标
          startO(func: uid(lessons), first: -1) { createdAt }
          # 结束游标
          endO(func: uid(lessons), first: 1) { createdAt } 
        }
      `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Lesson>>({
      query,
      vars: { $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async updateLesson (user: User, args: UpdateLessonArgs): Promise<Lesson> {
    const { id } = user
    const { lessonId, ...updateArgs } = args

    const query = `
      query v($id: string, $lessonId: string) {
        v(func: uid($id)) @filter(type(User)) { v as uid }
        q(func: uid(v)) {
          id: uid
          lessons @filter(eq(lessonId, $lessonId)) {
            q as uid
          }
        }
        l(func: uid(q)) { uid }
        target(func: uid(q)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const updateCond = '@if( eq(len(v), 1) and not eq(len(q), 0) )'
    const updateMutation = {
      uid: 'uid(q)',
      'dgraph.type': 'Lesson'
    }

    Object.assign(updateMutation, updateArgs)

    const mus = [
      {
        set: updateMutation,
        cond: updateCond
      }
    ]

    if (updateArgs.circle && updateArgs.circle.length !== 0) {
      Object.assign(mus, {
        del: {
          uid: 'uid(q)',
          circle: null
        }
      })
    }

    const res = await this.dbService.commitMutation<
    Map<string, string>,
    {
      v: Array<{ uid: string }>
      q: Array<{ uid: string }>
      l: Array<{ uid: string }>
      target: Lesson[]
    }
    >({
      query,
      vars: { $id: id, $lessonId: lessonId },
      mutations: mus
    })

    if (res.json.v.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (res.json.l.length === 0) {
      throw new UserNotHasTheLesson(id, lessonId)
    }

    Object.assign(res.json.target[0], updateArgs)

    return res.json.target[0]
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
      }
    `
    const condition = '@if( eq(len(v), 1) )'
    const mutation = {
      uid: 'uid(v)',
      lessons: {
        uid: '_:lesson',
        'dgraph.type': 'Lesson',
        createdAt: now(),
        name: args.name,
        destination: args.destination,
        description: args.description,
        circle: args.circle,
        lessonId: args.lessonId,
        educatorName: args.educatorName,
        startYear: args.startYear,
        endYear: args.endYear,
        semester: args.semester,
        color: args.color,
        startAt: args.startAt,
        endAt: args.endAt,
        dayInWeek: args.dayInWeek
      }
    }

    const res = await this.dbService.commitConditionalUperts<
    Map<string, string>,
    {
      v: Array<{ uid: string }>
    }
    >({
      query,
      mutations: [{ mutation, condition }],
      vars: { $id: id, $lessonId: args.lessonId }
    })

    if (res.json.v.length !== 1) {
      throw new UserNotFoundException(id)
    }

    const _id = res.uids?.get('lesson')

    if (!_id) {
      throw new SystemErrorException()
    }

    return {
      id: _id,
      description: args.description,
      destination: args.destination,
      name: args.name,
      circle: args.circle,
      lessonId: args.lessonId,
      educatorName: args.educatorName,
      startYear: args.startYear,
      endYear: args.endYear,
      semester: args.semester,
      color: args.color,
      createdAt: now(),
      startAt: args.startAt,
      endAt: args.endAt
    }
  }

  // async triggerLessonNotification ({
  //   to,
  //   startYear,
  //   endYear,
  //   semester,
  //   week,
  //   dayInWeek,
  //   taskType
  // }: TriggerLessonNotificationArgs) {
  //   // 通过 to 查询相应用户的 openId
  //   const res = await this.filterLessons(to, {
  //     week,
  //     dayInWeek,
  //     startYear,
  //     endYear,
  //     semester
  //   })

  //   if (res.user.length === 0) {
  //     throw new UserNotFoundException(to)
  //   }
  //   if (res.items.length === 0) {
  //     throw new UserNotHasLessonsTodayExcepton(to)
  //   }

  //   const { openId, grantType } = this.handleOpenId(
  //     res.user[0]?.openId,
  //     res.user[0]?.blankspaceOpenId,
  //     res.user[0]?.blankspaceAssistantOpenId
  //   )

  //   if (openId === '') {
  //     throw new BadOpenIdException(to)
  //   }

  //   const template = getLessonNotificationTemplate(openId, res.items, taskType)

  //   // 未知的 openId 同时尝试使用白板和白板助手的 accessToken 向微信服务器提交统一消息请求
  //   // 至少有一个请求会失败
  //   if (grantType === CODE2SESSION_GRANT_TYPE.UNKNOWN) {
  //     return await Promise.allSettled([
  //       this.wxService.sendUniformMessage(
  //         template,
  //         CODE2SESSION_GRANT_TYPE.BLANK_SPACE
  //       ),
  //       this.wxService.sendUniformMessage(
  //         template,
  //         CODE2SESSION_GRANT_TYPE.CURRICULUM
  //       )
  //     ]).then(r =>
  //       r
  //         ?.filter(i => i.status === 'fulfilled')
  //         ?.map((i: PromiseFulfilledResult<WxSendUniformMessageRet>) => i.value)
  //         ?.at(0)
  //     )
  //   }

  //   return await this.wxService.sendUniformMessage(template, grantType)
  // }

  handleOpenId (
    openId: string,
    blankspaceOpenId: string,
    blankspaceAssistantOpenId: string
  ) {
    if (blankspaceOpenId && blankspaceOpenId !== '') {
      return {
        openId: blankspaceOpenId,
        grantType: CODE2SESSION_GRANT_TYPE.BLANK_SPACE
      }
    }
    if (blankspaceAssistantOpenId && blankspaceAssistantOpenId !== '') {
      return {
        openId: blankspaceAssistantOpenId,
        grantType: CODE2SESSION_GRANT_TYPE.CURRICULUM
      }
    }
    if (openId && openId !== '') {
      return {
        openId,
        grantType: CODE2SESSION_GRANT_TYPE.UNKNOWN
      }
    }

    return {
      openId: '',
      grantType: CODE2SESSION_GRANT_TYPE.UNKNOWN
    }
  }

  // async mockTriggerLessonNotification ({
  //   to,
  //   startYear,
  //   endYear,
  //   semester,
  //   week,
  //   dayInWeek,
  //   taskType
  // }: TriggerLessonNotificationArgs) {
  //   this.logger.debug(`mockTriggerLessonNotification: to: ${to}`)

  //   const res = await this.filterLessons(to, {
  //     week,
  //     dayInWeek,
  //     startYear,
  //     endYear,
  //     semester
  //   })

  //   if (res.user.length === 0) {
  //     throw new UserNotFoundException(to)
  //   }
  //   if (res.items.length === 0) {
  //     throw new UserNotHasLessonsTodayExcepton(to)
  //   }

  //   const { openId, grantType } = this.handleOpenId(
  //     res.user[0]?.openId,
  //     res.user[0]?.blankspaceOpenId,
  //     res.user[0]?.blankspaceAssistantOpenId
  //   )

  //   if (openId === '') {
  //     throw new BadOpenIdException(to)
  //   }

  //   const template = getLessonNotificationTemplate(openId, res.items, taskType)

  //   // 未知的 openId 同时尝试使用白板和白板助手的 accessToken 向微信服务器提交统一消息请求
  //   // 至少有一个请求会失败
  //   if (grantType === CODE2SESSION_GRANT_TYPE.UNKNOWN) {
  //     return await Promise.allSettled([
  //       this.wxService.mockSendUniformMessage(
  //         template,
  //         CODE2SESSION_GRANT_TYPE.BLANK_SPACE
  //       ),
  //       this.wxService.mockSendUniformMessage(
  //         template,
  //         CODE2SESSION_GRANT_TYPE.CURRICULUM
  //       )
  //     ]).then(r => {
  //       return r
  //         ?.filter(i => i.status === 'fulfilled')
  //         ?.map((i: PromiseFulfilledResult<WxSendUniformMessageRet>) => i.value)
  //         ?.at(0)
  //     })
  //   }

  //   return await this.wxService.mockSendUniformMessage(template, grantType)
  // }
}
