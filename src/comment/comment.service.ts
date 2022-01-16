import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient, Mutation, Request } from 'dgraph-js'

import { DbService } from 'src/db/db.service'

import { Vote, VotesConnection } from '../votes/model/votes.model'
import {
  Comment,
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
    const query = `
        query v($uid: string) {
          comment(func: uid($uid)) @filter(type(Comment)){
            commentsCount: count(comments)
            comments (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Comment)) {
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
  }

  async addACommentOnComment (creator: string, content: string, commentId: string) {
    const txn = this.dgraph.newTxn()
    try {
      const now = new Date().toISOString()

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
    } finally {
      await txn.discard()
    }
  }

  async addACommentOnPost (creator: string, content: string, postId: string) {
    const txn = this.dgraph.newTxn()
    try {
      const now = new Date().toISOString()
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

      const x: Comment = {
        content,
        createdAt: now,
        id: u.getUidsMap().get('comment'),
        viewerCanUpvote: true
      }
      return x
    } finally {
      await txn.discard()
    }
  }

  async comment (id: CommentId) {
    const query = `
        query v($uid: string) {
          comment(func: uid($uid)) @filter(type(Comment)) {
            id: uid
            content
            createdAt
          }
        }
      `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $uid: id }))
      .getJson() as unknown as {
      comment: Comment[]
    }

    if (!res || !res.comment || res.comment.length !== 1) {
      throw new ForbiddenException(`评论 ${id} 不存在`)
    }
    return res.comment[0]
  }

  async getVotesByCommentId (viewerId: string, id: string, first: number, offset: number) {
    const query = `
      query v($commentId: string, $viewerId: string) {
        v(func: uid($commentId)) @filter(type(Comment)){
          totalCount: count(votes)
          canVote: votes @filter(uid_in(creator, $viewerId)) {
            uid
          }
        }
        u(func: uid($commentId)) @filter(type(Comment)) {
          votes (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Vote)) {
            id: uid
            createdAt
          }
        }
      }
    `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $commentId: id, $viewerId: viewerId }))
      .getJson() as unknown as {
      v: Array<{totalCount: number, canVote?: any[]}>
      u: Array<{votes: Vote[]}>
    }
    const u: VotesConnection = {
      nodes: res.u[0]?.votes || [],
      totalCount: res.v[0]?.totalCount,
      viewerCanUpvote: res.v[0]?.canVote === undefined,
      viewerHasUpvoted: res.v[0]?.canVote !== undefined
    }
    return u
  }
}
