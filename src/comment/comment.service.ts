import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient } from 'dgraph-js'

import { DbService } from 'src/db/db.service'

import { PostId } from '../db/model/db.model'
import { User } from '../user/models/user.model'
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

  async findCreatorByCommentId (id: string) {
    const query = `
      query v($commentId: string) {
        comment (func: uid($commentId)) @filter(type(Comment)) {
          creator @filter(type(User)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{comment: Array<{creator: User}>}>({ query, vars: { $commentId: id } })
    return res.comment[0]?.creator
  }

  async findPostByCommentId (id: string) {
    const query = `
      query v($commentId: string) {
        comment (func: uid($commentId)) @filter(type(Comment)) {
          post @filter(type(Post)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{comment: Array<{post: object}>}>({ query, vars: { $commentId: id } })
    return res.comment[0]?.post
  }

  async getCommentsByCommentId (id: CommentId, first: number, offset: number): Promise<CommentsConnection> {
    const query = `
        query v($uid: string) {
          var(func: uid($uid)) @recurse(loop: false) {
            A as uid
            comments
          }

          totalCount(func: uid(A)) @filter(type(Comment) AND NOT uid($uid)) {
            count(uid)
          }

          comment(func: uid($uid)) @filter(type(Comment)){
            comments (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Comment)) {
              id: uid
              expand(_all_)
            }
          }
        }
      `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      comment: {
        comments: Comment[]
      }
    }>({
      query,
      vars: {
        $uid: id
      }
    })

    if (!res) {
      throw new ForbiddenException(`评论 ${id} 不存在`)
    }
    return {
      nodes: res.comment[0]?.comments ?? [],
      totalCount: res.totalCount[0]?.count ?? 0
    }
  }

  /**
   * 返回对应帖子id下的评论
   * @param id 帖子id
   * @param first 前first条帖子
   * @param offset 偏移量
   * @returns {Promise<CommentsConnection>} CommentsConnection
   */
  async getCommentsByPostId (id: PostId, first: number, offset: number): Promise<CommentsConnection> {
    const query = `
          query v($uid: string) {
            # 包含已经被折叠的帖子
            var(func: uid($uid)) @recurse(loop: false) {
              A as uid
              comments
            }
  
            totalCount(func: uid(A)) @filter(type(Comment) AND NOT uid($uid)) {
              count(uid)
            }
  
            post(func: uid($uid)) @filter(type(Post)) {
              comments (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Comment) and not has(delete) and not has(fold)) {
                id: uid
                expand(_all_)
              }
            }
          }
        `
    const res = await this.dbService.commitQuery<{
      post: Array<{ comments?: Comment[]}>
      totalCount: Array<{count: number}>
    }>({ query, vars: { $uid: id } })

    if (!res.post) {
      throw new ForbiddenException(`帖子 ${id} 不存在`)
    }

    return {
      nodes: res.post[0]?.comments ?? [],
      totalCount: res.totalCount[0]?.count ?? 0
    }
  }

  async addCommentOnComment (creator: string, content: string, commentId: string): Promise<Comment> {
    const now = new Date().toISOString()

    const condition = '@if( eq(len(v), 1) AND eq(len(u), 1) )'
    const query = `
        query v($creator: string, $commentId: string) {
          # 评论创建者存在
          v(func: uid(${creator})) @filter(type(User)) { v as uid }
          # 评论存在
          u(func: uid(${commentId})) @filter(type(Comment)) { u as uid }
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

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
    }>({
      mutations: [{ mutation, condition }],
      query,
      vars: {
        $creator: creator,
        $commentId: commentId
      }
    })
    if (!res.json.v) {
      throw new ForbiddenException(`用户 ${creator} 不存在`)
    }
    if (!res.json.u) {
      throw new ForbiddenException(`评论 ${commentId} 不存在`)
    }
    return {
      content,
      createdAt: now,
      id: res.uids.get('comment')
    }
  }

  async addCommentOnPost (creator: string, content: string, postId: string): Promise<Comment> {
    const now = new Date().toISOString()
    const condition = '@if( eq(len(v), 1) AND eq(len(u), 1) )'
    const query = `
      query v($creator: string, $postId: string) {
        # 评论的创建者存在
        v(func: uid($creator)) @filter(type(User)) { v as uid }
        # 帖子存在
        u(func: uid($postId)) @filter(type(Post)) { u as uid }
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
          // 评论的创建者
          creator: {
            uid: creator
          }
        }
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
    }>({
      mutations: [{ mutation, condition }],
      query,
      vars: {
        $creator: creator,
        $postId: postId
      }
    })

    if (!res.json.v) {
      throw new ForbiddenException(`用户 ${creator} 不存在`)
    }

    if (!res.json.u) {
      throw new ForbiddenException(`帖子 ${postId} 不存在`)
    }

    return {
      content,
      createdAt: now,
      id: res.uids.get('comment')
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
