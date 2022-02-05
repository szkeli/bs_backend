import { ForbiddenException, Injectable } from '@nestjs/common'

import { Comment } from '../comment/models/comment.model'
import { DbService } from '../db/db.service'
import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { Post } from '../posts/models/post.model'
import { now } from '../tool'
import { User } from '../user/models/user.model'
import { Pin } from './models/pins.model'

@Injectable()
export class PinsService {
  constructor (private readonly dbService: DbService) {}

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

  async pins (first: number, offset: number) {
    const query = `
        query {
            totalCount(func: type(Pin)) { count(uid) }
            pins (func: type(Pin), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
                id: uid
                expand(_all_)
            }
        }
      `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{ count: number }>
      pins: Pin[]
    }>({ query })

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.pins ?? []
    }
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

  async to (pinId: string) {
    const query = `
        query v($pinId: string) {
            pin(func: uid($pinId)) @filter(type(Pin)) {
                to @filter(type(Post) or type(Comment)) {
                    id: uid
                    dgraph.type
                    expand(_all_)
                }
            }
        }
      `
    const res = await this.dbService.commitQuery<{pin: Array<{to: typeof PostAndCommentUnion & { 'dgraph.type': string}}>}>({ query, vars: { $pinId: pinId } })
    if (res.pin[0].to['dgraph.type'].includes('Post')) {
      return new Post(res.pin[0].to as unknown as Post)
    }
    if (res.pin[0].to['dgraph.type'].includes('Comment')) {
      return new Comment(res.pin[0].to as unknown as Comment)
    }
  }

  async creator (id: string) {
    const query = `
        query v($pinId: string) {
            pin(func: uid($pinId)) @filter(type(Pin)) {
                creator @filter(type(Admin)) {
                    id: uid
                    expand(_all_)
                }
            }
        }
    `
    const res = await this.dbService.commitQuery<{ pin: Array<{creator: User}>}>({
      query,
      vars: {
        $pinId: id
      }
    })
    return res.pin[0]?.creator
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
            # 帖子存在
            v(func: uid($postId)) @filter(type(Post)) { v as uid }
            # 该帖子未被置顶
            q(func: uid($postId)) @filter(type(Post) and not has(pin)) { q as uid }
            # 全局一个时间只能有一个置顶
            u(func: type(Post)) @filter(has(pin)) { u as uid }
        }
    `
    const _now = now()
    const condition = '@if( eq(len(x), 1) and eq(len(v), 1) and eq(len(u), 0) and eq(len(q), 1) )'
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
      u: Array<{uid: string}>
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
    if (res.json.u.length !== 0) {
      throw new ForbiddenException('已存在置顶帖子，请先取消该帖子的置顶')
    }

    return {
      id: res.uids.get('pin'),
      createdAt: _now
    }
  }
}
