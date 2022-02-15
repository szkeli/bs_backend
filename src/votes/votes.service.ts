import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient } from 'dgraph-js'

import { DbService } from 'src/db/db.service'

import { Comment } from '../comment/models/comment.model'
import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { NOTIFICATION_ACTION } from '../notifications/models/notifications.model'
import { Post } from '../posts/models/post.model'
import { User } from '../user/models/user.model'
import { Votable, Vote, VotesConnection } from './model/votes.model'

@Injectable()
export class VotesService {
  async votesCreatedWithin (startTime: string, endTime: string, first: number, offset: number): Promise<VotesConnection> {
    const query = `
      query v($startTime: string, $endTime: string) {
        var(func: between(createdAt, $startTime, $endTime)) @filter(type(Vote)) {
          votes as uid
        }
        totalCount(func: uid(votes)) {
          count(uid)
        }
        votes(func: uid(votes), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
          id: uid
          expand(_all_)
        }
      }
    `

    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      votes: Vote[]
    }>({ query, vars: { $startTime: startTime, $endTime: endTime } })

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.votes ?? [],
      // 当前用户是管理员所以...
      viewerCanUpvote: false,
      viewerHasUpvoted: false
    }
  }

  async findVotesByUid (id: string, first: number, offset: number): Promise<VotesConnection> {
    const query = `
      query v($uid: string) {
        user(func: uid($uid)) @filter(type(User)) {
          count: count(votes @filter(type(Vote)))
          votes (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Vote)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{user: Array<{count: number, votes: Vote[]}>}>({ query, vars: { $uid: id } })
    return {
      totalCount: res.user[0]?.count ?? 0,
      nodes: res.user[0]?.votes ?? [],
      viewerCanUpvote: false,
      viewerHasUpvoted: true
    }
  }

  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async creator (id: string) {
    const query = `
      query v($voteId: string) {
        vote(func: uid($voteId)) @filter(type(Vote)) {
          creator @filter(type(User)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{ vote: Array<{creator: User}>}>({ query, vars: { $voteId: id } })
    return res.vote[0]?.creator
  }

  async to (id: string) {
    const query = `
      query v($voteId: string) {
        vote(func: uid($voteId)) @filter(type(Vote)) {
          to @filter(type(Post) or type(Comment)) {
            id: uid
            expand(_all_)
            dgraph.type
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{vote: Array<{to: (typeof PostAndCommentUnion) & {'dgraph.type': string[]}}>}>({ query, vars: { $voteId: id } })
    const v = res.vote[0]?.to
    if (v['dgraph.type'].includes('Post')) {
      return new Post(v as unknown as Post)
    }
    if (v['dgraph.type'].includes('Comment')) {
      return new Comment(v as unknown as Comment)
    }
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
      totalCount: res?.json.voteCountOfComment[0]?.voteCount + 1 || 0,
      viewerHasUpvoted: res?.json.x?.length === 0,
      to
    }
  }

  async addUpvoteOnPost (voter: string, to: string): Promise<Votable> {
    const now = new Date().toISOString()
    // 1. 用户存在
    // 2. 帖子存在
    // 3. 用户没有为帖子点过赞
    const query = `
      query v($voter: string, $to: string){
        # 发起点赞的用户存在
        v(func: uid($voter)) @filter(type(User)) { v as uid }
        # 被点赞的帖子存在
        u(func: uid($to)) @filter(type(Post)) { u as uid }
        # 发起点赞的用户没有为当前帖子点赞
        x(func: uid($voter)) @filter(type(User)) {
          votes @filter(type(Vote)) {
            to @filter(uid($to) and type(Post)) {
              x as uid
            }
          }
        }
        # 帖子的创建者 用于通知该User 帖子被点赞
        creator(func: uid($to)) @filter(type(Post)) {
          creator @filter(type(User)) {
            postCreator as uid
          }
        }
        # 帖子的创建者是否点赞的发起者
        y(func: uid($to)) @filter(type(Post) and uid_in(creator, $voter)) {
          y as uid
        }
        voteCountOfPost(func: uid(${to})) @filter(type(Post)) { voteCount: count(votes) }
      }
    `
    const addUpvoteOnPostCondition = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) )'
    const addUpvoteOnPostMutation = {
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

    const addNotificationCondition = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 0) and eq(len(y), 0) )'
    const addNotificationMutation = {
      uid: '_:notification',
      'dgraph.type': 'Notification',
      createdAt: now,
      // 通知评论的创建者
      to: {
        uid: 'uid(postCreator)',
        notifications: {
          uid: '_:notification'
        }
      },
      // 通知的创建者
      creator: {
        uid: voter
      },
      about: {
        uid: to
      },
      action: NOTIFICATION_ACTION.ADD_UPVOTE_ON_POST,
      isRead: false
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v?: [{uid: string}]
      u?: [{uid: string}]
      x?: Array<{votes: any}>
      y: Array<{uid: string}>
      voteCountOfPost: [{ voteCount: number }]
    }>({
      mutations: [
        { mutation: addUpvoteOnPostMutation, condition: addUpvoteOnPostCondition },
        { mutation: addNotificationMutation, condition: addNotificationCondition }
      ],
      query,
      vars: { $voter: voter, $to: to }
    })

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
      totalCount: res?.json.voteCountOfPost[0]?.voteCount + 1 || 0,
      viewerHasUpvoted: res?.json.x?.length === 0,
      to
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
      totalCount: res.json.u[0].totalCount === 0 ? res.json.u[0].totalCount : res.json.u[0].totalCount - 1,
      to
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
      totalCount: res.json.u[0].totalCount === 0 ? res.json.u[0].totalCount : res.json.u[0].totalCount - 1,
      to
    }
  }
}
