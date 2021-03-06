import { Injectable } from '@nestjs/common'

import { UserAlreadyHasTheDeadline, UserNotFoundException, UserNotHasTheLesson } from '../app.exception'
import { DbService } from '../db/db.service'
import { Lesson } from '../lessons/models/lessons.model'
import { now } from '../tool'
import { AddDealineArgs, Deadline, DEADLINE_TYPE } from './models/deadlines.model'

@Injectable()
export class DeadlinesService {
  constructor (private readonly dbService: DbService) {}

  async addDeadline (id: string, args: AddDealineArgs) {
    if (args.lessonId) {
      return await this.addDeadlineToLesson(id, args)
    }

    return await this.createDeadline(id, args)
  }

  async addDeadlineToLesson (id: string, { lessonId, deadlineId, courseName, startDate, endDate, title, type }: AddDealineArgs): Promise<Deadline> {
    const query = `
      query v($id: string, $lessonId: string, $deadlineId: string) {
        # 当前用户是否存在
        u(func: uid($id)) @filter(type(User)) { u as uid }
        # 当前用户是否具有该 Lesson
        v(func: uid(u)) {
          lessons @filter(type(Lesson) and eq(lessonId, $lessonId)) {
            v as uid
          }
        }
        # 当前用户未添加该 Deadline
        c(func: uid(u)) {
          deadlines @filter(type(Deadline) and eq(deadlineId, $deadlineId)) {
            c as uid
          }
        }
      }
    `
    const condition = '@if( eq(len(u), 1) and eq(len(v), 1) and eq(len(c), 0) )'
    const mutation = {
      uid: 'uid(u)',
      deadlines: {
        uid: '_:deadline',
        'dgraph.type': 'Deadline',
        deadlineId,
        createdAt: now(),
        courseName,
        startDate,
        endDate,
        title,
        lesson: {
          uid: 'uid(v)'
        },
        type: DEADLINE_TYPE.AUTO_IMPORT
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      u: Array<{uid: string}>
      v: Array<{lessons: Array<{uid: string}>}>
      c: Array<{deadlines: Deadline[]}>
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: { $id: id, $lessonId: lessonId, $deadlineId: deadlineId }
    })

    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (res.json.v.length !== 1) {
      throw new UserNotHasTheLesson(id, lessonId)
    }
    if (res.json.c.length !== 0) {
      throw new UserAlreadyHasTheDeadline(id, deadlineId)
    }

    return {
      id: res.uids.get('deadline'),
      courseName,
      startDate,
      endDate,
      title,
      type,
      createdAt: now()
    }
  }

  async createDeadline (id: string, { deadlineId, courseName, startDate, endDate, title, type }: AddDealineArgs): Promise<Deadline> {
    const query = `
      query v($id: string, $deadlineId: string) {
        u(func: uid($id)) @filter(type(User)) {
          u as uid
        }
        v(func: uid(u)) {
          deadlines @filter(type(Deadline) and eq(deadlineId, $deadlineId)) {
            v as uid
          }
        }
      }
    `
    const condition = '@if( eq(len(u), 1) and eq(len(v), 0) )'
    const mutation = {
      uid: 'uid(u)',
      deadlines: {
        uid: '_:deadline',
        'dgraph.type': 'Deadline',
        deadlineId,
        createdAt: now(),
        courseName,
        startDate,
        endDate,
        title,
        type: DEADLINE_TYPE.USER_CREATE
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      u: Array<{uid: string}>
      v: Array<{uid: string}>
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: { $id: id, $deadlineId: deadlineId }
    })

    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (res.json.v.length !== 0) {
      throw new UserAlreadyHasTheDeadline(id, deadlineId)
    }

    return {
      id: res.uids.get('deadline'),
      courseName,
      startDate,
      endDate,
      title,
      type,
      createdAt: now()
    }
  }

  async lesson (id: string) {
    const query = `
    query v($id: string) {
      var(func: uid($id)) @filter(type(Deadline)) {
        lesson as lesson @filter(type(Lesson))
      }
      lesson(func: uid(lesson)) {
        id: uid
        expand(_all_)
      }
    }
  `
    const res = await this.dbService.commitQuery<{lesson: Lesson[]}>({ query, vars: { $id: id } })

    return res.lesson[0]
  }

  async deadline (id: string) {
    const query = `
      query v($deadlineId: string) {
        deadline(func: uid($deadlineId)) @filter(type(Deadline)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{deadline: Deadline[]}>({ query, vars: { $deadlineId: id } })
    return res.deadline[0]
  }
}
