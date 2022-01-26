import { ForbiddenException, Injectable } from '@nestjs/common'

import { Admin } from '../admin/models/admin.model'
import { DbService } from '../db/db.service'
import { Fold, FoldsConnection } from './models/folds.model'

@Injectable()
export class FoldsService {
  constructor (private readonly dbService: DbService) {}

  async findFoldsByAdminId (id: string, first: number, offset: number): Promise<FoldsConnection> {
    const query = `
        query v($adminId: string) {
            totalCount(func: uid($adminId)) @filter(type(Admin)) {
                count: count(folds)
            }
            admin(func: uid($adminId)) @filter(type(Admin)) {
                folds (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Fold)) {
                    id: uid
                    expand(_all_)
                }
            }
        }
      `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      admin: Array<{folds: Fold[]}>
    }>({ query, vars: { $adminId: id } })
    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.admin[0]?.folds ?? []
    }
  }

  async to (id: string) {
    const query = `
        query v($foldId: string) {
            fold(func: uid($foldId)) @filter(type(Fold)) {
                to @filter(type(Comment)) {
                    id: uid
                    expand(_all_)
                }
            }
        }
        `
    const res = await this.dbService.commitQuery<{fold: Array<{to: Comment}>}>({ query, vars: { $foldId: id } })
    return res.fold[0]?.to
  }

  async creator (id: string) {
    const query = `
        query v($foldId: string) {
            fold(func: uid($foldId)) @filter(type(Fold)) {
                creator @filter(type(Admin)) {
                    id: uid
                    expand(_all_)
                }
            }
        }
      `
    const res = await this.dbService.commitQuery<{fold: Array<{creator: Admin}>}>({ query, vars: { $foldId: id } })
    return res.fold[0]?.creator
  }

  async folds (first: number, offset: number) {
    const query = `
        query v {
            totalCount(func: type(Fold)) { count: count(uid) }
            folds(func: type(Fold), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
                id: uid
                expand(_all_)
            }
        }
      `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      folds: Fold[]
    }>({ query })
    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.folds ?? []
    }
  }

  async addFoldOnComment (adminId: string, commentId: string) {
    const now = new Date().toISOString()
    const query = `
        query v($admin: string, $commentId: string) {
            v(func: uid($admin)) @filter(type(Admin)) { v as uid }
            u(func: uid($commentId)) @filter(type(Comment)) { u as uid }
        }
    `
    const condition = '@if( eq(len(v), 1) and eq(len(u), 1) )'
    const mutation = {
      uid: '_:fold',
      'dgraph.type': 'Fold',
      createdAt: now,
      creator: {
        uid: adminId,
        folds: {
          uid: '_:fold'
        }
      },
      to: {
        uid: commentId,
        fold: {
          uid: '_:fold'
        }
      }
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
    }>({
      mutations: [{ mutation, condition }],
      query,
      vars: { $admin: adminId, $commentId: commentId }
    })
    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`管理员 ${adminId} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`评论 ${commentId} 不存在`)
    }
    console.error(res)

    return {
      id: res.uids.get('fold'),
      createdAt: now
    }
  }
}
