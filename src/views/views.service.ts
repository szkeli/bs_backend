import { ForbiddenException, Injectable } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { PostId } from '../db/model/db.model'

@Injectable()
export class ViewsService {
  constructor (private readonly dbService: DbService) {}

  async addViewOnComment (creatorId: string, commentId: string) {
    const now = new Date().toISOString()
    const condition = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) )'
    const query = `
      query v($uid: string, $commentId: string) {
        # 用户存在
        v(func: uid($uid)) @filter(type(User)) { v as uid }
        # 评论存在
        u(func: uid($commentId)) @filter(type(Comment)) { u as uid }
        # 用户没有浏览过该评论
        x(func: uid($uid)) @filter(type(User)) {
          views @filter(type(View) AND uid_in(to, $commentId)) {
            x as uid
          }
        } 
      }
    `
    const mutation = {
      uid: '_:view',
      'dgraph.type': 'View',
      createdAt: now,
      to: {
        uid: commentId,
        views: {
          uid: '_:view'
        }
      },
      creator: {
        uid: creatorId,
        views: {
          uid: '_:view'
        }
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{views: Array<{uid: string}>}>
    }>({
      mutations: [{ mutation, condition }],
      query,
      vars: {
        $uid: creatorId, $commentId: commentId
      }
    })
    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`用户 ${creatorId} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`评论 ${commentId} 不存在`)
    }
    if (res.json.x.length !== 0) {
      throw new ForbiddenException(`用户 ${creatorId} 已经浏览过评论 ${commentId}`)
    }
    return {
      createdAt: now,
      id: res.uids.get('view')
    }
  }

  async addViewOnPost (creatorId: string, postId: PostId) {
    const now = new Date().toISOString()
    const condition = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) )'
    const query = `
      query v($uid: string, $postId: string) {
        # 用户存在
        v(func: uid($uid)) @filter(type(User)) { v as uid }
        # 帖子存在
        u(func: uid($postId)) @filter(type(Post)) { u as uid }
        # 用户没有浏览过该帖子
        x(func: uid($uid)) @filter(type(User)) {
          views @filter(type(View) AND uid_in(to, $postId)) {
            x as uid
          }
        } 
      }
    `
    const mutation = {
      uid: '_:view',
      'dgraph.type': 'View',
      createdAt: now,
      to: {
        uid: postId,
        views: {
          uid: '_:view'
        }
      },
      creator: {
        uid: creatorId,
        views: {
          uid: '_:view'
        }
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{views: Array<{uid: string}>}>
    }>({
      mutations: [{ mutation, condition }],
      query,
      vars: {
        $uid: creatorId, $postId: postId
      }
    })
    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`用户 ${creatorId} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`帖子 ${postId} 不存在`)
    }
    if (res.json.x.length !== 0) {
      throw new ForbiddenException(`用户 ${creatorId} 已经浏览过帖子 ${postId}`)
    }
    return {
      createdAt: now,
      id: res.uids.get('view')
    }
  }
}
