import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient, Mutation, Request } from 'dgraph-js'

import { DbService } from 'src/db/db.service'

import {
  CommentId,
  CommentsConnection
} from './models/comment.model'

@Injectable()
export class CommentService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async getCommentsByCommentId (id: CommentId, first: number, offset: number) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query v($uid: string) {
          comment(func: uid($uid)) {
            commentsCount: count(comments)
            comments (orderdesc: createdAt, first: ${first}, offset: ${offset}) {
              id: uid
              content
              createdAt
            }
          }
        }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .queryWithVars(query, { $uid: id })
      const v = res.getJson().comment[0]
      if (!v) {
        throw new ForbiddenException(`评论 ${id} 不存在`)
      }
      const u: CommentsConnection = {
        nodes: v.comments ? v.comments : [],
        totalCount: v.commentsCount
      }
      return u
    } finally {
      await txn.discard()
    }
  }

  async addACommentOnComment (creator: string, content: string, commentId: string) {
    const now = new Date().toISOString()
    const txn = this.dgraph.newTxn()
    const conditions = '@if( eq(len(v), 1) AND eq(len(u), 1) )'
    const query = `
      query {
        v(func: uid(${creator})) { v as uid }
        u(func: uid(${commentId})) { u as uid }
      }
    `
    const mutation = {
      uid: commentId,
      comments: {
        uid: '_:comment',
        'dgraph.type': 'Comment',
        content,
        createdAt: now,
        // 评论所属的评论
        comment: {
          uid: commentId
        },
        creator: {
          uid: creator
        }
      }
    }
    const mu = new Mutation()
    mu.setSetJson(mutation)
    mu.setCond(conditions)

    const req = new Request()
    req.setQuery(query)
    req.addMutations(mu)
    req.setCommitNow(true)

    const u = await txn.doRequest(req)
    const res = u.getJson()

    if (!res.v) {
      throw new ForbiddenException(`用户 ${creator} 不存在`)
    }
    if (!res.u) {
      throw new ForbiddenException(`评论 ${commentId} 不存在`)
    }
    return {
      content,
      createdAt: now,
      id: u.getUidsMap().get('comment')
    }
  }

  async addACommentOnPost (creator: string, content: string, postId: string) {
    const now = new Date().toISOString()
    const txn = this.dgraph.newTxn()
    const conditions = '@if( eq(len(v), 1) AND eq(len(u), 1) )'
    const query = `
      query {
        v(func: uid(${creator})) { v as uid }
        u(func: uid(${postId})) { u as uid }
      }
    `
    const mutation = {
      uid: creator,
      posts: {
        uid: postId,
        comments: {
          uid: '_:comment',
          'dgraph.type': 'Comment',
          content,
          createdAt: now,
          // 评论所属的帖子
          post: {
            uid: postId
          },
          creator: {
            uid: creator
          }
        }
      }
    }

    const mu = new Mutation()
    mu.setSetJson(mutation)
    mu.setCond(conditions)

    const req = new Request()
    req.setQuery(query)
    req.addMutations(mu)
    req.setCommitNow(true)

    const u = await txn.doRequest(req)
    const res = u.getJson()

    if (!res.v) {
      throw new ForbiddenException(`用户 ${creator} 不存在`)
    }
    if (!res.u) {
      throw new ForbiddenException(`帖子 ${postId} 不存在`)
    }

    return {
      content,
      createdAt: now,
      id: u.getUidsMap().get('comment')
    }
  }

  async comment (id: CommentId) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query v($uid: string) {
          comment(func: uid($uid)) {
            id: uid
            content
            createdAt
          }
        }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .queryWithVars(query, { $uid: id })
      const user = res.getJson().user[0]
      if (!user) {
        throw new Error('Can not find the user')
      }
      return user
    } finally {
      await txn.discard()
    }
  }
}
