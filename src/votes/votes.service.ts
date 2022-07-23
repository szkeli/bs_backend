import { ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { PubSub } from 'graphql-subscriptions'

import { DbService } from 'src/db/db.service'

import { CommentNotFoundException, UserAlreayAddUpvoteOnIt, UserNotFoundException } from '../app.exception'
import { Comment } from '../comment/models/comment.model'
import { PUB_SUB_KEY } from '../constants'
import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { NOTIFICATION_ACTION } from '../notifications/models/notifications.model'
import { Post } from '../posts/models/post.model'
import { Vote, VotesConnection } from './model/votes.model'

@Injectable()
export class VotesService {
  constructor (
    @Inject(PUB_SUB_KEY) private readonly pubSub: PubSub,
    private readonly dbService: DbService
  ) {}

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

  async addUpvoteOnComment (voter: string, to: string): Promise<Comment> {
    const now = new Date().toISOString()
    const query = `
      query v($voter: string, $to: string) {
        # 评论的创建者是否点赞的发起者
        var(func: uid(u)) @filter(uid_in(creator, $voter)) { y as uid }
        # 1. 用户存在
        v(func: uid($voter)) @filter(type(User)) { v as uid }
        # 2. 评论存在
        u(func: uid($to)) @filter(type(Comment)) {
          id: u as uid
          expand(_all_)
          dgraph.type
        }
        # 3. 用户是否已点赞评论
        x(func: uid(v)) {
          votes @filter(type(Vote)) {
            to @filter(uid(u)) {
              x as uid
            }
          }
        }
        # 评论的创建者
        comment(func: uid(u)) {
          creator @filter(type(User)) {
            commentCreator as uid
          }
        }
        voteCountOfComment(func: uid(u)) { voteCount: count(votes) }
      }
    `
    const addUpvoteOnCommentCondition = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) )'
    const addUpvoteOnCommentMutation = {
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

    const addNotificationCondition = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) and eq(len(y), 0) )'
    const addNotificationMutation = {
      uid: '_:notification',
      'dgraph.type': 'Notification',
      createdAt: now,
      to: {
        uid: 'uid(commentCreator)',
        notifications: {
          uid: '_:notification'
        }
      },
      creator: {
        uid: voter
      },
      about: {
        uid: to
      },
      action: NOTIFICATION_ACTION.ADD_UPVOTE_ON_COMMENT,
      isRead: false
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Comment[]
      x: Array<{votes: any}>
      comment: Array<{creator: {uid: string}}>
      voteCountOfComment: [{ voteCount: number }]
    }>({
      mutations: [
        { mutation: addUpvoteOnCommentMutation, condition: addUpvoteOnCommentCondition },
        { mutation: addNotificationMutation, condition: addNotificationCondition }
      ],
      query,
      vars: { $voter: voter, $to: to }
    })

    if (res.uids.get('notification')) {
      // 发送通知到websocket
      await this.pubSub.publish('notificationsAdded', {
        notificationsAdded: {
          id: res.uids.get('notification'),
          createdAt: now,
          action: NOTIFICATION_ACTION.ADD_UPVOTE_ON_COMMENT,
          isRead: false,
          to: res.json.comment[0]?.creator?.uid
        }
      })
    }

    if (res.json.x?.length !== 0) {
      throw new UserAlreayAddUpvoteOnIt(voter, to)
    }

    if (res.json.v.length !== 1) {
      throw new UserNotFoundException(voter)
    }
    if (res.json.u.length !== 1) {
      throw new CommentNotFoundException(to)
    }

    return res.json.u[0]
  }

  async addUpvoteOnPost (voter: string, to: string): Promise<Post> {
    const now = new Date().toISOString()
    // 1. 用户存在
    // 2. 帖子存在
    // 3. 用户没有为帖子点过赞
    const query = `
      query v($voter: string, $to: string){
        # 发起点赞的用户存在
        v(func: uid($voter)) @filter(type(User)) { v as uid }
        # 被点赞的帖子存在
        u(func: uid($to)) @filter(type(Post)) { 
          id: u as uid
          expand(_all_)
          dgraph.type
        }
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
      v: Array<{uid: string}>
      u: Post[]
      x: Array<{votes: any}>
      y: Array<{uid: string}>
      creator: Array<{creator: {uid: string}}>
      voteCountOfPost: [{ voteCount: number }]
    }>({
      mutations: [
        { mutation: addUpvoteOnPostMutation, condition: addUpvoteOnPostCondition },
        { mutation: addNotificationMutation, condition: addNotificationCondition }
      ],
      query,
      vars: { $voter: voter, $to: to }
    })

    if (res.uids.get('notification')) {
      // 向websocket发送通知
      await this.pubSub.publish(
        'notificationsAdded',
        {
          notificationsAdded: {
            id: res.uids.get('notification'),
            createdAt: now,
            action: NOTIFICATION_ACTION.ADD_UPVOTE_ON_POST,
            isRead: false,
            to: res.json.creator[0]?.creator?.uid
          }
        }
      )
    }

    if (res.json.x?.length !== 0) {
      throw new ForbiddenException('不能重复点赞')
    }

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`用户 ${voter} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`帖子 ${to} 不存在`)
    }

    return res.json.u[0]
  }

  async removeUpvoteOnComment (voter: string, to: string): Promise<Comment> {
    const query = `
      query v($user: string, $comment: string){
        # 点赞者存在
        v(func: uid(${voter})) @filter(type(User)) { v as uid }
        # 评论存在
        u(func: uid(${to})) @filter(type(Comment)) {
          id: u as uid 
          totalCount: count(votes)
          expand(_all_)
          dgraph.type
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
      u: Comment[]
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

    return res.json.u[0]
  }

  async removeUpvoteOnPost (voter: string, to: string): Promise<Post> {
    const query = `
      query v($user: string, $post: string) {
        # 用户存在
        v(func: uid(${voter})) @filter(type(User)) { v as uid }
        # 该帖子存在
        u(func: uid(${to})) @filter(type(Post)) {
          id: u as uid 
          totalCount: count(votes @filter(type(Vote)))
          expand(_all_)
          dgraph.type
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
      u: Post[]
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

    return res.json.u[0]
  }
}
