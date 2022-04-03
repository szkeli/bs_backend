import { ForbiddenException, Injectable } from '@nestjs/common'

import { UserAlreadyHasTheCurriculume, UserNotFoundException } from '../app.exception'
import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { AddCurriculumArgs, Curriculum, UpdateCurriculumArgs } from './models/curriculums.model'

@Injectable()
export class CurriculumsService {
  constructor (private readonly dbService: DbService) {}

  async deadlines (args: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
  }

  async updateCurriculum (id: any, args: UpdateCurriculumArgs) {
    throw new Error('Method not implemented.')
  }

  async curriculum (id: string) {
    const query = `
      query v($id: string) {
        curriculum (func: uid($id)) @filter(type(Curriculum)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{curriculum: Curriculum[]}>({ query, vars: { $id: id } })
    if (res.curriculum.length !== 1) {
      throw new ForbiddenException(`课程 ${id} 不存在`)
    }
    return res.curriculum[0]
  }

  async curriculums ({ first, after, orderBy }: RelayPagingConfigArgs) {
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.curriculumsRelayForward(first, after)
    }
    throw new Error('Method not implemented.')
  }

  async curriculumsRelayForward (first: number, after: string) {
    const q1 = 'var(func: uid(curriculums), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($after: string) {
          curriculums as var(func: type(Curriculum), orderdesc: createdAt)
          ${after ? q1 : ''}
          totalCount(func: uid(curriculums)) { count(uid) }
          objs(func: uid(${after ? 'q' : 'curriculums'}), orderdesc: createdAt, first: ${first}) {
            id: uid
            expand(_all_)
          }
          # 开始游标
          startO(func: uid(curriculums), first: -1) { createdAt }
          # 结束游标
          endO(func: uid(curriculums), first: 1) { createdAt } 
        }
      `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Curriculum>>({ query, vars: { $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  /**
   * 将当前用户添加到对应的课程中；
   * 课程不存在时，根据课程号创建课程对象，
   * @param id 用户id
   * @param args props
   * @returns {Promise<Curriculum}
   */
  async addCurriculum (id: string, args: AddCurriculumArgs): Promise<Curriculum> {
    const now = new Date().toISOString()
    const query = `
      query v($creatorId: string, $curriculumId: string) {
        # 当前用户是否存在
        v(func: uid($creatorId)) @filter(type(User)) { v as uid }
        # 课程是否存在
        x(func: eq(curriculumId, $curriculumId)) @filter(type(Curriculum)) { x as uid }
        # 当前用户是否已经添加了该课程
        q(func: uid($creatorId)) @filter(type(User)) {
          curriculums @filter(type(Curriculum) AND eq(curriculumId, $curriculumId)) {
            q as uid
          }
        }
        # 返回该课程
        g(func: eq(curriculumId, $curriculumId)) @filter(type(Curriculum)) {
          id: uid
          expand(_all_)
        }
      }
    `

    // 课程和授课教师都已经存在
    const conditionAlready = '@if( eq(len(v), 1) and eq(len(x), 1) and eq(len(q), 0) )'
    const mutationAlready = {
      uid: 'uid(v)',
      curriculums: {
        uid: 'uid(x)'
      }
    }

    // 课程不存在
    const conditionWithEducatorExist = '@if( eq(len(v), 1) and eq(len(x), 0) and eq(len(q), 0) )'
    const mutationWithEducatorExist = {
      uid: 'uid(v)',
      curriculums: {
        // 课程内部id
        uid: '_:curriculum',
        // 添加的对象类型
        'dgraph.type': 'Curriculum',
        // 课程的创建时间
        createdAt: now,
        // 课程的名字
        name: args.name,
        // 课程开始的时间
        start: args.start,
        // 课程结束时间
        end: args.end,
        // 课程描述
        description: args.description,
        // 课程地点
        destination: args.destination,
        // 要上课的周
        circle: args.circle,
        // 课程id
        curriculumId: args.curriculumId,
        // 教师名字
        educatorName: args.educatorName,
        // 该课程位于一星期的第几天
        dayOfWeek: args.dayOfWeek
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      x: Array<{uid: string}>
      q: Array<{uid: string}>
      g: Curriculum[]
    }>({
      mutations: [
        { mutation: mutationAlready, condition: conditionAlready },
        { mutation: mutationWithEducatorExist, condition: conditionWithEducatorExist }
      ],
      query,
      vars: {
        $creatorId: id,
        $curriculumId: args.curriculumId
      }
    })

    if (res.json.q.length !== 0) {
      throw new UserAlreadyHasTheCurriculume(id)
    }
    if (res.json.v.length !== 1) {
      throw new UserNotFoundException(id)
    }

    if (res.json.v.length === 1 && res.json.x.length === 1) {
      return res.json.g[0]
    }

    return {
      id: res.uids.get('curriculum'),
      ...args,
      createdAt: now
    }
  }
}
