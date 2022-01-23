import { ForbiddenException, Injectable } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { AddCurriculumArgs, Curriculum } from './models/curriculums.model'

@Injectable()
export class CurriculumsService {
  constructor (private readonly dbService: DbService) {}

  /**
   * 将当前用户添加到对应的课程中，课程不存在时，
   * 根据课程号创建课程，教师不存在时，
   * 根据教师名字创建教师对象
   * @param id 用户id
   * @param args props
   * @returns {Promise<Curriculum}
   */
  async addCurriculum (id: string, args: AddCurriculumArgs): Promise<Curriculum> {
    const now = new Date().toISOString()
    const query = `
      query v($creatorId: string, $educatorName: string, $curriculumId: string) {
        # 当前用户是否存在
        v(func: uid($creatorId)) @filter(type(User)) { v as uid }
        # 课程是否存在
        x(func: eq(curriculumId, $curriculumId)) @filter(type(Curriculum)) { x as uid }
        # 授课教师是否存在
        u(func: eq(name, $educatorName)) @filter(type(Educator)) { u as uid }
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
    const conditionAlready = '@if( eq(len(v), 1) AND eq(len(x), 1) AND eq(len(u), 1) AND eq(len(q), 0) )'
    const mutationAlready = {
      uid: 'uid(v)',
      curriculums: {
        uid: 'uid(x)'
      }
    }

    const conditionWithEducatorExist = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) AND eq(len(q), 0) )'
    const mutationWithEducatorExist = {
      uid: 'uid(v)',
      curriculums: {
        uid: '_:curriculum',
        'dgraph.type': 'Curriculum',
        createdAt: now,
        name: args.name,
        start: args.start,
        end: args.end,
        description: args.description,
        destination: args.destination,
        circle: args.circle,
        curriculumId: args.curriculumId,
        educator: {
          uid: 'uid(u)',
          name: args.educatorName,
          curriculums: {
            uid: '_:curriculum'
          }
        }
      }
    }

    const conditionWithEducatorNotExist = '@if( eq(len(v), 1) AND eq(len(u), 0) AND eq(len(x), 0) AND eq(len(q), 0) )'
    const mutationWithEducatorNoExist = {
      uid: 'uid(v)',
      curriculums: {
        uid: '_:curriculum',
        'dgraph.type': 'Curriculum',
        createdAt: now,
        name: args.name,
        start: args.start,
        end: args.end,
        description: args.description,
        destination: args.destination,
        circle: args.circle,
        curriculumId: args.curriculumId,
        educator: {
          uid: '_:educator',
          'dgraph.type': 'Educator',
          name: args.educatorName,
          curriculums: {
            uid: '_:curriculum'
          }
        }
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      x: Array<{uid: string}>
      u: Array<{uid: string}>
      q: Array<{uid: string}>
      g: Curriculum[]
    }>({
      mutations: [
        { mutation: mutationAlready, condition: conditionAlready },
        { mutation: mutationWithEducatorExist, condition: conditionWithEducatorExist },
        { mutation: mutationWithEducatorNoExist, condition: conditionWithEducatorNotExist }
      ],
      query,
      vars: {
        $creatorId: id,
        $curriculumId: args.curriculumId,
        $educatorName: args.educatorName
      }
    })
    if (res.json.q.length !== 0) {
      throw new ForbiddenException(`用户 ${id} 已经添加该课程`)
    }
    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`用户 ${id} 不存在`)
    }

    if (res.json.v.length === 1 && res.json.x.length === 1 && res.json.u.length === 1) {
      return res.json.g[0]
    } else {
      return {
        id: res.uids.get('curriculum'),
        ...args
      }
    }
  }
}
