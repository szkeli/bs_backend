import { Injectable } from '@nestjs/common'

import { AdminNotFoundException, LessonNotFoundException, UserAlreadyHasTheLesson, UserNotFoundException } from '../app.exception'
import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { Deadline } from '../deadlines/models/deadlines.model'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { handleRelayForwardAfter, now, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { AddLessonArgs, FilterLessonsArgs, Lesson, LessonItem, UpdateLessonArgs } from './models/lessons.model'

@Injectable()
export class LessonsService {
  constructor (private readonly dbService: DbService) {}

  async filterLessons (id: string, { week, dayInWeek, startYear, endYear, semester }: FilterLessonsArgs) {
    const query = `
      query v($id: string) {
        user(func: uid($to)) @filter(type(User)) {
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
      items: Array<LessonItem & { lesson: Lesson }>
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
}
