import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient } from 'dgraph-js'

import { DbService } from '../db/db.service'
import { Delete } from './models/deletes.model'

@Injectable()
export class DeletesService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async deleteComment (adminId: string, commentId: string): Promise<Delete> {
    const now = new Date().toISOString()
    const query = `
        query v($adminId: string, $commentId: string) {
          # 管理员存在
          v(func: uid($adminId)) @filter(type(Admin)) { v as uid }
          # 评论存在
          u(func: uid($commentId)) @filter(type(Comment)) { u as uid }
          # 评论未被删除
          x(func: uid($commentId)) @filter(type(Comment)) {
            delete @filter(type(Delete)) {
              x as uid
            }
          }
        }
      `
    const conditions = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) )'
    const mutation = {
      uid: '_:delete',
      'dgraph.type': 'Delete',
      createdAt: now,
      to: {
        uid: commentId,
        delete: {
          uid: '_:delete'
        }
      },
      creator: {
        uid: adminId,
        deletes: {
          uid: '_:delete'
        }
      }
    }
    const res = await this.dbService.commitConditionalUpsertWithVars<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{}>
    }>({
      conditions,
      mutation,
      query,
      vars: {
        $adminId: adminId,
        $commentId: commentId
      }
    })

    if (res.json.x.length !== 0) {
      throw new ForbiddenException(`评论 ${commentId} 已被删除`)
    }
    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`管理员 ${adminId} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`评论 ${commentId} 不存在`)
    }
    return {
      createdAt: now,
      id: res.uids.get('delete')
    }
  }

  async deletePost (adminId: string, postId: string): Promise<Delete> {
    const now = new Date().toISOString()

    const query = `
        query v($adminId: string, $postId: string) {
          # 管理员存在
          v(func: uid($adminId)) @filter(type(Admin)) { v as uid }
          # 帖子存在
          u(func: uid($postId)) @filter(type(Post)) { u as uid }
          # 帖子未被删除
          x(func: uid($postId)) @filter(type(Post)) {
            delete @filter(type(Delete)) {
              x as uid
            }
          }
        }
      `
    const conditions = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) )'
    const mutation = {
      uid: '_:delete',
      'dgraph.type': 'Delete',
      createdAt: now,
      to: {
        uid: postId,
        delete: {
          uid: '_:delete'
        }
      },
      creator: {
        uid: adminId,
        deletes: {
          uid: '_:delete'
        }
      }
    }
    const res = await this.dbService.commitConditionalUpsertWithVars<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{}>
    }>({
      conditions,
      mutation,
      query,
      vars: {
        $adminId: adminId,
        $postId: postId
      }
    })

    if (res.json.x.length !== 0) {
      throw new ForbiddenException(`帖子 ${postId} 已被删除`)
    }
    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`管理员 ${adminId} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`帖子 ${postId} 不存在`)
    }
    return {
      createdAt: now,
      id: res.uids.get('delete')
    }
  }
}
