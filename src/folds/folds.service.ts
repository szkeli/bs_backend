import { ForbiddenException, Injectable } from '@nestjs/common'

import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { btoa, relayfyArrayForward } from '../tool'
import { Fold } from './models/folds.model'

@Injectable()
export class FoldsService {
  constructor (private readonly dbService: DbService) {}

  async folds ({ first, after, orderBy }: RelayPagingConfigArgs) {
    after = btoa(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.foldsWithRelayForward(first, after)
    }
    throw new Error('Method not implemented.')
  }

  async foldsWithRelayForward (first: number, after: string | null) {
    const q1 = 'var(func: uid(folds), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($after: string) {
        var(func: type(Fold)) { folds as uid }

        ${after ? q1 : ''}
        totalCount (func: uid(folds)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'folds'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(folds), first: -1) {
          createdAt
        }
        endO(func: uid(folds), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startO: Array<{createdAt: string}>
      endO: Array<{createdAt: string}>
      objs: Fold[]
    }>({ query, vars: { $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async addFoldOnComment (adminId: string, commentId: string) {
    const now = new Date().toISOString()
    const query = `
        query v($admin: string, $commentId: string) {
            # 管理员存在
            v(func: uid($admin)) @filter(type(Admin)) { v as uid }
            # 评论存在
            u(func: uid($commentId)) @filter(type(Comment)) { u as uid }
            # 评论未被折叠
            x(func: uid($commentId)) @filter(type(Comment) and not has(fold)) { x as uid }
        }
    `
    const condition = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 1) )'
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
      x: Array<{uid: string}>
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
    if (res.json.x.length !== 1) {
      throw new ForbiddenException(`评论 ${commentId} 已经被折叠`)
    }

    return {
      id: res.uids.get('fold'),
      createdAt: now
    }
  }
}
