import { ForbiddenException, Injectable } from '@nestjs/common'

import { Admin } from '../admin/models/admin.model'
import { AdminNotFoundException, SubjectNotFoundException, SystemErrorException } from '../app.exception'
import { DbService } from '../db/db.service'
import { Subject } from '../subject/model/subject.model'
import { CreateSubFieldArgs, SubField } from './models/subfields.model'

@Injectable()
export class SubfieldsService {
  constructor (private readonly dbService: DbService) {}

  async subject (id: string) {
    const query = `
        query v($id: string) {
            var(func: uid($id)) @filter(type(SubField)) {
                s as subject @filter(type(Subject))
            }
            s(func: uid(s)) {
                id: uid
                expand(_all_)
            }
        }
    `
    const res = await this.dbService.commitQuery<{s: Subject[]}>({
      query,
      vars: { $id: id }
    })
    return res.s[0]
  }

  async createSubField (admin: Admin, args: CreateSubFieldArgs): Promise<SubField> {
    const { title, avatarImageUrl, subjectId } = args
    const query = `
        query v($adminId: string, $subjectId: string, $title: string) {
            a(func: uid($adminId)) @filter(type(Admin)) { a as uid }
            s(func: uid($subjectId)) @filter(type(Subject)) { s as uid }
            # 是否有 title 相同的 SubField
            t(func: eq(title, $title)) @filter(type(SubField)) { t as uid }
        }
    `
    const condition = '@if( eq(len(a), 1) and eq(len(s), 1) and eq(len(t), 0) )'
    const mutation = {
      uid: '_:subfield',
      'dgraph.type': 'SubField',
      title,
      avatarImageUrl,
      subject: {
        uid: 'uid(s)'
      },
      creator: {
        uid: 'uid(a)'
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      a: Array<{uid: string}>
      s: Array<{uid: string}>
      t: Array<{uid: string}>
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: {
        $adminId: admin.id,
        $subjectId: subjectId,
        $title: title
      }
    })
    if (res.json.a.length !== 1) {
      throw new AdminNotFoundException(admin.id)
    }
    if (res.json.s.length !== 1) {
      throw new SubjectNotFoundException(subjectId)
    }
    if (res.json.t.length !== 0) {
      throw new ForbiddenException('已有相同 title 的 SubField')
    }

    const _id = res.uids.get('subfield')
    if (!_id) {
      throw new SystemErrorException()
    }
    return {
      id: _id,
      title,
      avatarImageUrl
    }
  }

  async creator (id: string) {
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(SubField)) {
          creator as creator @filter(type(Admin))
        }
        c(func: uid(creator)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{c: Admin[]}>({ query, vars: { $id: id } })
    return res.c[0]
  }
}