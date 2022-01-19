import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient, Mutation, Request } from 'dgraph-js'
import { networkInterfaces } from 'os'

import { DbService } from '../db/db.service'

@Injectable()
export class DeletesService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async deletePost (adminId: string, postId: string) {
    const txn = this.dgraph.newTxn()
    const now = new Date().toISOString()
    try {
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

      const mu = new Mutation()
      mu.setSetJson(mutation)
      mu.setCond(conditions)

      const req = new Request()
      const vars = req.getVarsMap()
      vars.set('$adminId', adminId)
      vars.set('$postId', postId)

      req.setQuery(query)
      req.addMutations(mu)
      req.setCommitNow(true)

      const res = await txn.doRequest(req)
      const json = res.getJson() as unknown as {
        v: Array<{uid: string}>
        u: Array<{uid: string}>
        x: Array<{}>
      }
      const uid = res.getUidsMap().get('delete')

      if (json.x.length !== 0) {
        throw new ForbiddenException(`帖子 ${postId} 已被删除`)
      }
      if (json.v.length !== 1) {
        throw new ForbiddenException(`管理员 ${adminId} 不存在`)
      }
      if (json.u.length !== 1) {
        throw new ForbiddenException(`帖子 ${postId} 不存在`)
      }
      return {
        createdAt: now,
        id: uid
      }
    } finally {
      await txn.discard()
    }
  }
}
