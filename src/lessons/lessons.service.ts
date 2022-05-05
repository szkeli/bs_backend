import { Injectable } from '@nestjs/common'

import { AdminNotFoundException, BadOpenIdException, LessonNotFoundException, UserAlreadyHasTheLesson, UserNotFoundException, UserNotHasLessonsTodayExcepton } from '../app.exception'
import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { Deadline } from '../deadlines/models/deadlines.model'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { fmtLessonTimeByDayInWeekThroughSchoolTimeTable, handleRelayForwardAfter, now, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { WxService } from '../wx/wx.service'
import { AddLessonArgs, FilterLessonsArgs, Lesson, LessonItem, LessonMetaData, TriggerLessonNotificationArgs, UpdateLessonArgs, UpdateLessonMetaDataArgs } from './models/lessons.model'

@Injectable()
export class LessonsService {
  constructor (
    private readonly dbService: DbService,
    private readonly wxService: WxService
  ) {}

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
          lessons @filter(type(Lesson) and eq(circle, ${week})) {
            items as lessonItems @filter(type(LessonItem) and eq(dayInWeek, ${dayInWeek}))
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
    query v($adminId: string, $id: string, $lessonId: string) {
        # 管理员是否存在
        u(func: uid($adminId)) @filter(type(Admin)) { u as uid }
        # 当前用户是否存在
        v(func: uid($id)) @filter(type(User)) { v as uid }
        # 课程是否存在
        x(func: eq(lessonId, $lessonId)) @filter(type(Lesson)) { x as uid }
        # 当前用户是否已经添加了该课程
        q(func: uid(v)) {
            curriculums @filter(type(Lesson) and eq(lessonId, $lessonId)) {
                q as uid
            }
        }
        # 查询该课程
        g(func: eq(lessonId, $lessonId)) @filter(type(Lesson)) {
            id: uid
            expand(_all_)
        }
    }
    `
    // 课程已经存在
    const already = '@if( eq(len(v), 1) and eq(len(x), 1) and eq(len(q), 0) and eq(len(u), 1) )'
    const alreadyMutation = {
      uid: 'uid(v)',
      lessons: {
        uid: 'uid(x)'
      }
    }

    const lessonItems = args.lessonItems.map((item, index) => ({
      uid: `_:lessonItem_${index}`,
      'dgraph.type': 'LessonItem',
      start: item.start,
      end: item.end,
      dayInWeek: item.dayInWeek
    }))
    // 课程不存在
    const create = '@if( eq(len(v), 1) and eq(len(x), 0) and eq(len(q), 0) and eq(len(u), 1) )'
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
      x: Array<{uid: string}>
      q: Array<{uid: string}>
      u: Array<{uid: string}>
      g: Lesson[]
    }>({
      mutations: [
        { mutation: alreadyMutation, condition: already },
        { mutation: createMutation, condition: create }
      ],
      query,
      vars: {
        $adminId: id,
        $id: args.id,
        $lessonId: args.lessonId
      }
    })

    if (res.json.u.length !== 1) {
      throw new AdminNotFoundException(id)
    }

    if (res.json.q.length !== 0) {
      throw new UserAlreadyHasTheLesson(args.id)
    }

    if (res.json.v.length !== 1) {
      throw new UserNotFoundException(args.id)
    }

    if (res.json.v.length === 1 && res.json.x.length === 1) {
      return res.json.g[0]
    }

    return {
      id: res.uids.get('lesson'),
      ...args,
      createdAt: now()
    }
  }

  async addLessonSelf (id: string, args: AddLessonArgs) {
    throw new Error('Method not implemented.')
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

    const data = {
      touser: res.user[0]?.openId,
      mp_template_msg: {
        appid: 'wxfcf7b19fdd5d9770',
        template_id: '49nv12UdpuLNktBfXNrH61-ci3x71_FX8hhAew8fQoQ',
        url: 'http://weixin.qq.com/download',
        miniprogram: {
          appid: 'wx10ac1dfea0e2b8c6',
          pagepath: '/pages/index/index'
        },
        data: {
          first: {
            value: `明天你有${res.items.length ?? 'N/A'}门课程`
          },
          // 所有课程
          // 线性代数；音乐；体育；（列举全部课程用分号连接）
          keyword1: {
            value: res.items.map(i => i.lesson[0]?.name ?? 'N/A').join('；') ?? 'N/A'
          },
          // 课程名称和时间
          // 【1，2节】8:30-9：55 线性代数
          // 【1，2节】8:30-9：55 线性代数
          keyword2: {
            value: res.items
              .map(i => `${fmtLessonTimeByDayInWeekThroughSchoolTimeTable(i.start, i.end)} ${i.lesson[0]?.name ?? 'N/A'}`)
              .join('\n')
          },
          // 上课地点
          // 【1，2节】师院B204
          // 【1，2节】师院B204
          keyword3: {
            value: res.items
              .map(i => `[${i.start},${i.end}节] ${i.lesson[0]?.destination ?? 'N/A'}`)
              .join('\n')
          },
          remark: {
            value: '详情请点击进入小程序查看'
          }
        }
      }
    }

    return await this.wxService.sendUniformMessage(data)
  }
}
