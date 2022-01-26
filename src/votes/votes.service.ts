import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient } from 'dgraph-js'

import { DbService } from 'src/db/db.service'

import { Votable } from './model/votes.model'

@Injectable()
export class VotesService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async addUpvoteOnComment (voter: string, to: string): Promise<Votable> {
    const now = new Date().toISOString()
    const conditions = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) )'
    const mutation = {
      uid: '_:vote',
      'dgraph.type': 'Vote',
      createdAt: now,
      type: 'VOTE2COMMENT',
      to: {
        uid: to,
        votes: {
          uid: '_:vote'
        }
      },
      creator: {
        uid: voter,
        votes: {
          uid: '_:vote'
        }
      }
    }
    const query = `
        query {
          # 1. 用户存在
          v(func: uid(${voter})) @filter(type(User)) { v as uid }
          # 2. 评论存在
          u(func: uid(${to})) @filter(type(Comment)) { u as uid }
          # 3. 用户没有为评论点过赞
          x(func: uid(${voter})) @filter(type(User)) {
            votes @filter(type(Vote)) {
              to @filter(uid(${to}) AND type(Comment)) {
                x as uid
              }
            }
          }
          voteCountOfComment(func: uid(${to})) @filter(type(Comment)) { voteCount: count(votes) }
        }
      `
    const res = await this.dbService.commitConditionalUpsertWithVars<Map<string, string>, {
      v?: [{uid: string}]
      u?: [{uid: string}]
      x?: Array<{votes: any}>
      voteCountOfComment: [{ voteCount: number }]
    }>({ conditions, mutation, query, vars: {} })

    if (res.json.x?.length !== 0) {
      throw new ForbiddenException('不能重复点赞')
    }

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`用户 ${voter} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`评论 ${to} 不存在`)
    }

    return {
      viewerCanUpvote: res?.json.x?.length !== 0,
      upvoteCount: res?.json.voteCountOfComment[0]?.voteCount + 1 || 0,
      viewerHasUpvoted: res?.json.x?.length === 0
    }
  }

  async addUpvoteOnPost (voter: string, to: string): Promise<Votable> {
    const now = new Date().toISOString()
    // 1. 用户存在
    // 2. 帖子存在
    // 3. 用户没有为帖子点过赞
    const conditions = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) )'
    const mutation = {
      uid: '_:vote',
      'dgraph.type': 'Vote',
      createdAt: now,
      type: 'VOTE2POST',
      to: {
        uid: to,
        votes: {
          uid: '_:vote'
        }
      },
      creator: {
        uid: voter,
        votes: {
          uid: '_:vote'
        }
      }
    }
    const query = `
        query {
          v(func: uid(${voter})) @filter(type(User)) { v as uid }
          u(func: uid(${to})) @filter(type(Post)) { u as uid }
          x(func: uid(${voter})) @filter(type(User)) {
            votes @filter(type(Vote)) {
              to @filter(uid(${to}) AND type(Post)) {
                x as uid
              }
            }
          }
          voteCountOfPost(func: uid(${to})) @filter(type(Post)) { voteCount: count(votes) }
        }
      `
    const res = await this.dbService.commitConditionalUpsertWithVars<Map<string, string>, {
      v?: [{uid: string}]
      u?: [{uid: string}]
      x?: Array<{votes: any}>
      voteCountOfPost: [{ voteCount: number }]
    }>({ conditions, mutation, query, vars: {} })

    if (res.json.x?.length !== 0) {
      throw new ForbiddenException('不能重复点赞')
    }

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`用户 ${voter} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`帖子 ${to} 不存在`)
    }

    return {
      viewerCanUpvote: res?.json.x?.length !== 0,
      upvoteCount: res?.json.voteCountOfPost[0]?.voteCount + 1 || 0,
      viewerHasUpvoted: res?.json.x?.length === 0
    }
  }

  async removeUpvoteOnComment (voter: string, to: string): Promise<Votable> {
    const mutation = {
      uid: 'uid(q)',
      'dgraph.type': 'Vote',
      to: {
        uid: to,
        votes: {
          uid: 'uid(q)'
        }
      },
      creator: {
        uid: voter,
        votes: {
          uid: 'uid(q)'
        }
      }
    }
    const query = `
      query v($user: string, $comment: string){
        # 点赞者存在
        v(func: uid(${voter})) @filter(type(User)) { v as uid }
        # 评论存在
        u(func: uid(${to})) @filter(type(Comment)) {
          u as uid 
          totalCount: count(votes)
        }
        # 点赞者确实为该评论点赞
        q(func: uid($user)) @filter(type(User)) {
          votes @filter(uid_in(to, $comment) and type(Vote)) {
            q as uid
          }
        }
      }
    `
    const condition = '@if( eq(len(v), 1) AND eq(len(u), 1) and eq(len(q), 1) )'

    const res = await this.dbService.commitConditionalDeletions<Map<string, string>, {
      v: [{uid: string}]
      u: [{uid: string, totalCount: number}]
      q: Array<{votes: any[]}>
    }>({
      mutations: [{ mutation, condition }],
      vars: {
        $user: voter,
        $comment: to
      },
      query
    })
    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`用户 ${voter} 不存在`)
    }

    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`评论 ${to} 不存在`)
    }

    if (res.json.q.length !== 1) {
      throw new ForbiddenException(`用户 ${voter} 没有点赞评论 ${to}`)
    }

    return {
      viewerHasUpvoted: false,
      viewerCanUpvote: true,
      upvoteCount: res.json.u[0].totalCount === 0 ? res.json.u[0].totalCount : res.json.u[0].totalCount - 1
    }
  }

  async removeUpvoteOnPost (voter: string, to: string): Promise<Votable> {
    const query = `
      query v($user: string, $post: string) {
        # 用户存在
        v(func: uid(${voter})) @filter(type(User)) { v as uid }
        # 该帖子存在
        u(func: uid(${to})) @filter(type(Post)) {
          u as uid 
          totalCount: count(votes @filter(type(Vote)))
        }
        # 该用户确实点赞过该帖子
        q(func:uid($user)) @filter(type(User)) {
          votes @filter(uid_in(to, $post) and type(Vote)) {
            q as uid
          }
        }
      }
    `
    const condition = '@if( eq(len(v), 1) AND eq(len(u), 1) and eq(len(q), 1) )'

    const mutation = {
      uid: 'uid(q)',
      'dgraph.type': 'Vote',
      to: {
        uid: to,
        votes: {
          uid: 'uid(q)'
        }
      },
      creator: {
        uid: voter,
        votes: {
          uid: 'uid(q)'
        }
      }
    }

    const res = await this.dbService.commitConditionalDeletions<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string, totalCount: number}>
      q: Array<{votes: any[]}>
    }>({
      mutations: [{ mutation, condition }],
      query,
      vars: { $user: voter, $post: to }
    })

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`用户 ${voter} 不存在`)
    }

    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`帖子 ${to} 不存在`)
    }

    if (res.json.q.length !== 1) {
      throw new ForbiddenException(`用户 ${voter} 没有点赞贴子 ${to}`)
    }

    return {
      viewerHasUpvoted: false,
      viewerCanUpvote: true,
      upvoteCount: res.json.u[0].totalCount === 0 ? res.json.u[0].totalCount : res.json.u[0].totalCount - 1
    }
  }
}
