import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient, Mutation, Request } from 'dgraph-js'

import { CommentsConnection } from 'src/comment/models/comment.model'
import { DbService } from 'src/db/db.service'
import { PostId, UserId } from 'src/db/model/db.model'

import { Post, PostsConnection } from './models/post.model'

@Injectable()
export class PostsService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async createAPost (
    creator: UserId,
    title: string,
    content: string,
    images: [string],
    subjectId: string
  ) {
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
          v(func: uid(${creator})) { v as uid }
          u(func: uid(${subjectId})) { u as uid }
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
          q(func: uid(${creator})) { v as uid }
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

  async deleteAPost (creator: UserId, id: PostId) {
    return await this.dbService.deleteAPost(creator, id)
  }

  async getPost (id: PostId) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query v($uid: string) {
          post(func: uid($uid)) {
            id: uid
            title
            content
            images
            createdAt
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
      return post
    } finally {
      await txn.discard()
    }
  }

  async getPosts (first: number, offset: number) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query {
          totalCount(func: type(Post)) {
            count(uid)
          }
          v(func: type(Post), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
            id: uid
            title
            content
            createdAt
          }
        }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .query(query)
      const v = res.getJson().v
      console.error(v)
      const u: PostsConnection = {
        nodes: v || [],
        totalCount: res.getJson().totalCount[0].count
      }
      return u
    } finally {
      await txn.discard()
    }
  }

  async getUserByPostId (id: PostId) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query v($uid: string) {
          post(func: uid($uid)) {
            creator {
              id: uid
              userId
              name
              avatarImageUrl
              gender
              school
              grade
              openId
              unionId
              createdAt
              updatedAt
              lastLoginedAt
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

  async getCommentsByPostId (id: PostId, first: number, offset: number) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query v($uid: string) {
          post(func: uid($uid)) {
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
      const v = res.getJson().post[0]
      if (!v) {
        throw new ForbiddenException(`帖子 ${id} 不存在`)
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
}
