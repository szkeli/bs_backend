import { ForbiddenException, Injectable } from '@nestjs/common'

import { SystemErrorException } from '../app.exception'
import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { btoa, now, relayfyArrayForward } from '../tool'
import { Pin, PinsConnection } from './models/pins.model'

@Injectable()
export class PinsService {
  constructor (private readonly dbService: DbService) {}

  async findPinsByAdminId (adminId: string, { first, last, after, before, orderBy }: RelayPagingConfigArgs) {
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.findPinsByAdminIdWithRelayForward(adminId, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async findPinsByAdminIdWithRelayForward (adminId: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(pins), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($adminId: string) {
        var(func: uid($adminId)) @filter(type(Admin)) {
          pins as pins (orderdesc: createdAt) @filter(type(Pin))
        }
        
        ${after ? q1 : ''}
        totalCount(func: uid(pins)) {
          count(uid)
        }
        pins(func: uid(${after ? 'q' : 'pins'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startPin(func: uid(pins), first: -1) {
          createdAt
        }
        # 结束游标
        endPin(func: uid(pins), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startPin: Array<{createdAt: string}>
      endPin: Array<{createdAt: string}>
      pins: Pin[]
    }>({ query, vars: { $adminId: adminId } })

    return relayfyArrayForward({
      startO: res.startPin,
      endO: res.endPin,
      objs: res.pins,
      totalCount: res.totalCount,
      first,
      after
    })
  }

  async removePinOnPost (i: string, from: string) {
    const query = `
          query v($adminId: string, $postId: string) {
              # 当前管理员存在
              v(func: uid($adminId)) @filter(type(Admin)) { v as uid }
              # 当前帖子存在
              u(func: uid($postId)) @filter(type(Post)) { u as uid }
              # 当前帖子被置顶
              x(func: uid($postId)) @filter(type(Post) and has(pin)) { x as uid }
              # 获取当前帖子置顶的创建者
              c(func: uid($postId)) @filter(type(Post) and has(pin)) {
                  pin @filter(type(Pin)) {
                      pin as uid
                      creator @filter(type(Admin)) {
                          creator as uid
                      }
                  }
              }
          }
        `

    const condition = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 1) )'
    const mutation = {
      uid: 'uid(pin)',
      'dgraph.type': 'Pin',
      creator: {
        uid: 'uid(creator)',
        pins: {
          uid: 'uid(pin)'
        }
      },
      to: {
        uid: from,
        pin: {
          uid: 'uid(pin)'
        }
      }
    }

    const res = await this.dbService.commitConditionalDeletions<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{uid: string}>
      c: any
    }>({ mutations: [{ mutation, condition }], query, vars: { $adminId: i, $postId: from } })

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`管理员 ${i} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`帖子 ${from} 不存在`)
    }
    if (res.json.x.length !== 1) {
      throw new ForbiddenException(`帖子 ${from} 未被置顶`)
    }
    return true
  }

  async pins ({ orderBy, first, after, last, before }: RelayPagingConfigArgs) {
    after = btoa(after)
    before = btoa(before)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.pinsWithRelayForward(first, after)
    }

    throw new Error('Method not implemented.')
  }

  async pinsWithRelayForward (first: number, after: string | null): Promise<PinsConnection> {
    const q1 = 'var(func: uid(pins), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($after: string) {
        var(func: type(Post)) @filter(has(pin) and not has(delete)) {
          posts as uid
        }
        var(func: uid(posts)) {
          v as pin
        }
        pins as var(func: uid(v), orderdesc: createdAt)

        ${after ? q1 : ''}

        totalCount(func: uid(pins)) {
          count(uid)
        }
        pins(func: uid(${after ? 'q' : 'pins'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startPin(func: uid(pins), first: -1) {
          createdAt
        }
        # 结束游标
        endPin(func: uid(pins), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{ count: number }>
      pins: Pin[]
      startPin: Array<{createdAt: string}>
      endPin: Array<{createdAt: string}>
    }>({ query, vars: { $after: after } })

    return relayfyArrayForward({
      startO: res.startPin,
      endO: res.endPin,
      objs: res.pins,
      first,
      after,
      totalCount: res.totalCount
    })
  }

  async pin (pinId: string) {
    const query = `
      query v($pinId: string) {
          pin(func: uid($pinId)) @filter(type(Pin)) {
              id: uid
              createdAt
          }
      }
    `
    const res = await this.dbService.commitQuery<{pin: Pin[]}>({ query, vars: { $pinId: pinId } })
    return res.pin[0]
  }

  //   /**
  //    * 置顶某个帖子里的评论
  //    * 一个帖子在一个时间只能有一个置顶评论
  //    * @param commentId 评论id
  //    */
  //   async addPinOnComment (i: string, commentId: string) {
  //     const query = `
  //         query v($adminId: string, $commentId: string) {
  //             # 管理员存在
  //             v(func: uid($adminId)) @filter(type(Admin)) { v as uid }
  //             # 评论存在
  //             u(func: uid($commentId)) @filter(type(Comment)) {
  //                 u as uid
  //             }
  //             x(func: uid())
  //         }
  //       `
  //   }

  /**
     * 置顶一个帖子
     * 全局一个时间只能有一个帖子
     * @param postId 帖子id
     */
  async addPinOnPost (i: string, postId: string): Promise<Pin> {
    const query = `
        query v($adminId: string, $postId: string) {
            # 当前管理员存在
            x(func: uid($adminId)) @filter(type(Admin)) { x as uid }
            # 帖子存在且未被删除
            v(func: uid($postId)) @filter(type(Post) and not has(delete)) { v as uid }
            # 该帖子未被置顶
            q(func: uid($postId)) @filter(type(Post) and not has(pin)) { q as uid }
        }
      `
    const _now = now()
    const condition = '@if( eq(len(x), 1) and eq(len(v), 1) and eq(len(q), 1) )'
    const mutation = {
      uid: '_:pin',
      'dgraph.type': 'Pin',
      createdAt: _now,
      creator: {
        uid: i,
        pins: {
          uid: '_:pin'
        }
      },
      to: {
        uid: postId,
        pin: {
          uid: '_:pin'
        }
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      x: Array<{uid: string}>
      v: Array<{uid: string}>
      q: Array<{uid: string}>
    }>({
      mutations: [{ mutation, condition }],
      query,
      vars: {
        $postId: postId,
        $adminId: i
      }
    })

    if (res.json.x.length !== 1) {
      throw new ForbiddenException(`管理员 ${i} 不存在`)
    }
    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`帖子 ${postId} 不存在`)
    }
    if (res.json.q.length !== 1) {
      throw new ForbiddenException(`帖子 ${postId} 已被置顶`)
    }

    const id = res.uids.get('pin')
    if (!id) {
      throw new SystemErrorException()
    }

    return {
      id,
      createdAt: _now
    }
  }
}
