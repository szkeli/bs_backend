import { ForbiddenException, Injectable } from '@nestjs/common'

import { UserAlreadyHasTheDeadline, UserNotFoundException, UserNotHasTheCurriculum } from '../app.exception'
import { Curriculum } from '../curriculums/models/curriculums.model'
import { DbService } from '../db/db.service'
import { now } from '../tool'
import { AddDealineArgs, Deadline, DEADLINE_TYPE } from './models/deadlines.model'

@Injectable()
export class DeadlinesService {
  constructor (private readonly dbService: DbService) {}

  async curriculum (id: string) {
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(Deadline)) {
          curriculum as ~deadlines @filter(type(Curriculum))
        }
        curriculum(func: uid(curriculum)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{curriculum: Curriculum[]}>({ query, vars: { $id: id } })

    return res.curriculum[0]
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

  async addDeadline (id: string, args: AddDealineArgs): Promise<Deadline> {
    if (args.type === DEADLINE_TYPE.AUTO_IMPORT) {
      return await this.addDeadlineByAutoImport(id, args)
    }
    if (args.type === DEADLINE_TYPE.USER_CREATE) {
      return await this.addDeadlineByUserCreate(id, args)
    }
    throw new Error('Method not implemented.')
  }

  async addDeadlineByAutoImport (id: string, { curriculumId, deadlineId, courseName, startDate, endDate, title, type }: AddDealineArgs): Promise<Deadline> {
    if (!curriculumId) {
      throw new ForbiddenException('必须提供 curriculumId')
    }
    const query = `
      query v($actor: string, $curriculumId: string, $deadlineId: string) {
        # 待关联的课程是否存在
        var(func: eq(curriculumId, $curriculumId)) @filter(type(Curriculum)) { c as uid }
        # 待添加的 deadlineId 是否已经存在 
        d(func: eq(deadlineId, $deadlineId)) @filter(type(Deadline)) { d as uid }
        # 操作者是否已经存在
        u(func: uid($actor)) @filter(type(User)) { u as uid }
        # 用户是否已经添加该课程
        i(func: uid(u)) {
          curriculums @filter(eq(curriculumId, $curriculumId)) {
            i as uid
          }
        }
        # 用户是否已添加该 deadline
        j(func: uid(u)) {
          deadlines @filter(eq(deadlineId, $deadlineId)) {
            j as uid
          }
        }
        # 尝试通过 deadlineId 获取 deadline
        deadline(func: uid(d)) {
          id: uid
        }
      }
    `
    // 1. deadlineId 对应的 deadline 不存在
    const withoutDeadlineIdCondition = '@if( eq(len(u), 1) and eq(len(c), 1) and eq(len(d), 0) and eq(len(i), 1) and eq(len(j), 0) )'
    const withoutDeadlineIdMutation = {
      uid: 'uid(u)',
      // 创建并将 deadline 关联到用户
      deadlines: {
        uid: '_:deadline',
        'dgraph.type': 'Deadline',
        createdAt: now(),
        deadlineId,
        curriculumId,
        courseName,
        startDate,
        endDate,
        title,
        type
      },
      // 将 deadline 关联到 curriculum
      curriculums: {
        uid: 'uid(c)',
        deadlines: {
          uid: '_:deadline'
        }
      }
    }

    // 2. deadlineId 对应的 deadline 存在
    const withDeadlineIdCondition = '@if( eq(len(u), 1) and eq(len(c), 1) and eq(len(d), 1) and eq(len(i), 1) and eq(len(j), 0) )'
    const withDeadlineMutation = {
      uid: 'uid(u)',
      deadlines: {
        uid: 'uid(d)'
      }
      // 此处不用再次将 deadline 添加到相应的 curriculum
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      u: Array<{uid: string}>
      i: Array<{uid: string}>
      j: Array<{uid: string}>
      deadline: Array<{id: string}>
    }>({
      query,
      mutations: [
        { mutation: withoutDeadlineIdMutation, condition: withoutDeadlineIdCondition },
        { mutation: withDeadlineMutation, condition: withDeadlineIdCondition }
      ],
      vars: {
        $actor: id,
        $curriculumId: curriculumId,
        $deadlineId: deadlineId
      }
    })

    if (res.json.i.length !== 1) {
      throw new UserNotHasTheCurriculum(id, curriculumId)
    }

    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }

    if (res.json.j.length !== 0) {
      throw new UserAlreadyHasTheDeadline(id, deadlineId)
    }

    return {
      id: res.uids.get('deadline') || res.json.deadline[0]?.id,
      createdAt: now(),
      courseName,
      startDate,
      endDate,
      title,
      type
    }
  }

  async addDeadlineByUserCreate (id: string, { deadlineId, courseName, startDate, endDate, title, type }: AddDealineArgs): Promise<Deadline> {
    const query = `
      query v($actor: string, $deadlineId: string) {
        # deadlineId 对应的 deadline 是否已经存在
        d(func: eq(deadlineId, $deadlineId)) @filter(type(Deadline)) { d as uid }
        # 用户是否存在
        u(func: uid($actor)) @filter(type(User)) { u as uid }
      }
    `
    const condition = '@if( eq(len(d), 0) and eq(len(u), 1) )'
    const mutation = {
      uid: 'uid(u)',
      deadlines: {
        uid: '_:deadline',
        'dgraph.type': 'Deadline',
        createdAt: now(),
        deadlineId,
        courseName,
        startDate,
        endDate,
        title,
        type
      }
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      u: Array<{uid: string}>
      d: Array<{uid: string}>
    }>({
      query,
      mutations: [{ condition, mutation }],
      vars: { $actor: id, $deadlineId: deadlineId }
    })

    if (res.json.d.length !== 0) {
      throw new UserAlreadyHasTheDeadline(id, deadlineId)
    }
    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }

    return {
      id: res.uids.get('deadline'),
      createdAt: now(),
      courseName,
      startDate,
      endDate,
      title,
      type
    }
  }
}
