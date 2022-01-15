import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient, Mutation, Request } from 'dgraph-js'

import { DbService } from 'src/db/db.service'

import { Votable } from './model/votes.model'

@Injectable()
export class VotesService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async voteAComment (voter: string, to: string) {
    const now = new Date().toISOString()
    const txn = this.dgraph.newTxn()
    try {
      // 1. 用户存在
      // 2. 评论存在
      // 3. 用户没有为评论点过赞
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
          v(func: uid(${voter})) { v as uid }
          u(func: uid(${to})) { u as uid }
          x(func: uid(${voter})) {
            votes {
              to @filter(uid(${to})) {
                x as uid
              }
            }
          }
          voteCountOfComment(func: uid(${to})) { voteCount: count(votes) }
        }
      `
      const mu = new Mutation()
      mu.setSetJson(mutation)
      mu.setCond(conditions)

      const req = new Request()
      req.setQuery(query)
      req.addMutations(mu)
      req.setCommitNow(true)
      const res = await (await txn.doRequest(req)).getJson() as unknown as {
        v?: [{uid: string}]
        u?: [{uid: string}]
        x?: Array<{votes: any}>
        voteCountOfComment: [{ voteCount: number }]
      }

      if (res.x?.length !== 0) {
        throw new ForbiddenException('不能重复点赞')
      }

      const u: Votable = {
        viewerCanUpvote: res?.x?.length !== 0,
        upvoteCount: res?.voteCountOfComment[0]?.voteCount + 1 || 0,
        viewerHasUpvoted: res?.x?.length === 0
      }
      return u
    } finally {
      await txn.discard()
    }
  }

  async voteAPost (voter: string, to: string) {
    const now = new Date().toISOString()
    const txn = this.dgraph.newTxn()
    try {
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
          v(func: uid(${voter})) { v as uid }
          u(func: uid(${to})) { u as uid }
          x(func: uid(${voter})) {
            votes {
              to @filter(uid(${to})) {
                x as uid
              }
            }
          }
          voteCountOfPost(func: uid(${to})) { voteCount: count(votes) }
        }
      `
      const mu = new Mutation()
      mu.setSetJson(mutation)
      mu.setCond(conditions)

      const req = new Request()
      req.setQuery(query)
      req.addMutations(mu)
      req.setCommitNow(true)
      const res = await (await txn.doRequest(req)).getJson() as unknown as {
        v?: [{uid: string}]
        u?: [{uid: string}]
        x?: Array<{votes: any}>
        voteCountOfPost: [{ voteCount: number }]
      }
      if (res.x?.length !== 0) {
        throw new ForbiddenException('不能重复点赞')
      }

      const u: Votable = {
        viewerCanUpvote: res?.x?.length !== 0,
        upvoteCount: res?.voteCountOfPost[0]?.voteCount + 1 || 0,
        viewerHasUpvoted: res?.x?.length === 0
      }
      return u
    } finally {
      await txn.discard()
    }
  }

  async unvoteAComment (voter: string, to: string) {
    const txn = this.dgraph.newTxn()
    try {
      const mutation = {
        uid: 'uid(q)',
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
          v(func: uid(${voter})) { v as uid }
          u(func: uid(${to})) {
            u as uid 
            totalCount: count(votes)
          }
          x(func:uid($user)) {
            votes @filter(uid_in(to, $comment)) {
              q as uid
            }
          }
        }
      `
      // 1. 点赞者存在
      // 2. 评论存在
      const conditions = '@if( eq(len(v), 1) AND eq(len(u), 1) )'
      const mu = new Mutation()
      mu.setDeleteJson(mutation)
      mu.setCond(conditions)

      const req = new Request()
      req.addMutations(mu)
      req.getVarsMap().set('$user', voter)
      req.getVarsMap().set('$comment', to)
      req.setQuery(query)
      req.setCommitNow(true)

      const res = await (await txn.doRequest(req)).getJson() as unknown as {
        v: [{uid: string}]
        u: [{uid: string, totalCount: number}]
        x: Array<{votes: any[]}>
      }
      if (res.x.length === 0) {
        throw new ForbiddenException('取消点赞失败')
      }
      const u: Votable = {
        viewerHasUpvoted: false,
        viewerCanUpvote: true,
        upvoteCount: res.u[0].totalCount === 0 ? res.u[0].totalCount : res.u[0].totalCount - 1
      }
      return u
    } finally {
      await txn.discard()
    }
  }

  async unvoteAPost (voter: string, to: string) {
    const txn = this.dgraph.newTxn()
    try {
      const mutation = {
        uid: 'uid(q)',
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
        query v($user: string, $post: string){
          v(func: uid(${voter})) { v as uid }
          u(func: uid(${to})) {
            u as uid 
            totalCount: count(votes)
          }
          x(func:uid($user)) {
            votes @filter(uid_in(to, $post)) {
              q as uid
            }
          }
        }
      `
      // 1. 点赞者存在
      // 2. 帖子存在
      const conditions = '@if( eq(len(v), 1) AND eq(len(u), 1) )'
      const mu = new Mutation()
      mu.setDeleteJson(mutation)
      mu.setCond(conditions)

      const req = new Request()
      req.addMutations(mu)
      req.getVarsMap().set('$user', voter)
      req.getVarsMap().set('$post', to)
      req.setQuery(query)
      req.setCommitNow(true)

      const res = await (await txn.doRequest(req)).getJson() as unknown as {
        v: [{uid: string}]
        u: [{uid: string, totalCount: number}]
        x: Array<{votes: any[]}>
      }
      if (res.x.length === 0) {
        throw new ForbiddenException('取消点赞失败')
      }
      const u: Votable = {
        viewerHasUpvoted: false,
        viewerCanUpvote: true,
        upvoteCount: res.u[0].totalCount === 0 ? res.u[0].totalCount : res.u[0].totalCount - 1
      }
      return u
    } finally {
      await txn.discard()
    }
  }
}
