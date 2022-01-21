import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient, Mutation, Request } from 'dgraph-js'

import { Comment, CommentsConnection } from 'src/comment/models/comment.model'
import { DbService } from 'src/db/db.service'
import { PostId } from 'src/db/model/db.model'

import { Vote, VotesConnection } from '../votes/model/votes.model'
import { CreatePostArgs, Post, PostsConnection } from './models/post.model'

@Injectable()
export class PostsService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async createAPost (creator: string, { title, content, images, subjectId }: CreatePostArgs) {
    const txn = this.dgraph.newTxn()
    let conditions: string
    let query: string
    let mutation: object
    const now = new Date().toISOString()
    try {
      if (subjectId) {
        conditions = '@if( eq(len(v), 1) AND eq(len(u), 1) )'
        query = `
          query {
            # 创建者存在
            v(func: uid(${creator})) @filter(type(User)) { v as uid }
            # 主题存在
            u(func: uid(${subjectId})) @filter(type(Subject)) { u as uid }
          }
        `
        mutation = {
          uid: creator,
          posts: {
            uid: '_:post',
            'dgraph.type': 'Post',
            title,
            content,
            images,
            createdAt: now,
            creator: {
              uid: creator,
              posts: {
                uid: '_:post'
              }
            },
            subject: {
              uid: subjectId,
              posts: {
                uid: '_:post'
              }
            }
          }
        }
      } else {
        conditions = '@if( eq(len(v), 1) )'
        query = `
        query {
          q(func: uid(${creator})) @filter(type(User)) { v as uid }
        }
      `
        mutation = {
          uid: creator,
          posts: {
            uid: '_:post',
            'dgraph.type': 'Post',
            title,
            content,
            images,
            createdAt: now,
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
      const res = await txn.doRequest(req)
      console.error(res.getJson())
      if (!subjectId) {
        const v = res.getJson().q[0]
        if (!v) {
          throw new ForbiddenException(`${creator} 用户不存在`)
        }
      }
      if (subjectId) {
        const v = res.getJson().v[0]
        const u = res.getJson().u[0]
        if (!v) {
          throw new ForbiddenException(`用户 ${creator} 不存在`)
        }
        if (!u) {
          throw new ForbiddenException(`主题 ${subjectId} 不存在`)
        }
      }

      const post: Post = {
        id: res.getUidsMap().get('post'),
        title,
        content,
        images,
        createdAt: new Date(now).toISOString()
      }

      return post
    } finally {
      await txn.discard()
    }
  }

  async post (id: PostId) {
    const query = `
        query v($uid: string) {
          post(func: uid($uid)) @filter(type(Post)) {
            id: uid
            expand(_all_)
          }
        }
      `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $uid: id }))
      .getJson() as unknown as {
      post: Post[]
    }

    if (!res || !res.post || res.post.length !== 1) {
      throw new ForbiddenException(`帖子 ${id} 不存在`)
    }
    return res.post[0]
  }

  async posts (first: number, offset: number) {
    const query = `
        query {
          totalCount(func: type(Post)) @filter(type(Post) AND NOT has(delete)) {
            count(uid)
          }
          v(func: type(Post), orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Post) AND NOT has(delete)) {
            id: uid
            expand(_all_)
          }
        }
      `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .query(query))
      .getJson() as unknown as {
      totalCount: Array<{count: number}>
      v: Post[]
    }
    const u: PostsConnection = {
      nodes: res.v || [],
      totalCount: res.totalCount[0].count
    }
    return u
  }

  async getUserByPostId (id: PostId) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query v($uid: string) {
          post(func: uid($uid)) @filter(type(Post)) {
            creator @filter(type(User)) {
              id: uid
              expand(_all_)
            }
          }
        }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .queryWithVars(query, { $uid: id })
      const post = res.getJson().post[0]
      if (!post) {
        throw new ForbiddenException(`帖子 ${id} 不存在`)
      }
      if (!post.creator) {
        throw new ForbiddenException(`查询帖子 ${id} 的创建者失败`)
      }
      return post.creator
    } finally {
      await txn.discard()
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
          totalCount(func: uid($uid)) @filter(type(Post)) {
            comments @filter(type(Comment) AND NOT has(delete)) {
              count: count(uid)
            }
          }
          post(func: uid($uid)) @filter(type(Post)) {
            comments (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Comment) AND NOT has(delete)) {
              id: uid
              expand(_all_)
            }
          }
        }
      `
    const res = await this.dbService.commitQuery<{
      post: Array<{ comments?: Comment[]}>
      totalCount: Array<{comments: Array<{count: number}>}>
    }>({ query, vars: { $uid: id } })

    if (!res.post) {
      throw new ForbiddenException(`帖子 ${id} 不存在`)
    }

    return {
      nodes: res.post[0]?.comments || [],
      totalCount: res?.totalCount[0]?.comments[0]?.count || 0
    }
  }

  /**
   * 返回帖子的点赞 并计算当前浏览者是否点赞
   * @param viewerId 浏览者id
   * @param postId 帖子id
   * @returns { Promise<VotesConnection> }
   */
  async getVotesByPostId (viewerId: string, postId: string, first: number, offset: number): Promise<VotesConnection> {
    const query = `
      query v($viewerId: string, $postId: string) {
        q(func: uid($postId)) @filter(type(Post)) {
          v: votes @filter(uid_in(creator, $viewerId) AND type(Vote)) {
            uid
          }
          totalCount: count(votes)
        }
        v(func: uid($postId)) @filter(type(Post)) {
          votes (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Vote)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $viewerId: viewerId, $postId: postId }))
      .getJson() as unknown as {
      q: Array<{v?: Array<{uid: string}>, totalCount: number}>
      v: Array<{votes?: Vote[]}>
    }

    const u: VotesConnection = {
      nodes: res.v[0]?.votes || [],
      totalCount: res.q[0].totalCount,
      viewerHasUpvoted: res.q[0].v !== undefined,
      viewerCanUpvote: res.q[0].v === undefined
    }
    return u
  }
}
