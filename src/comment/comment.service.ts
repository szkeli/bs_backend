import { ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { DgraphClient } from 'dgraph-js'

import { DbService } from 'src/db/db.service'

import { Anonymous } from '../anonymous/models/anonymous.model'
import {
  CannotCommentUser, CommentNotFoundException, ParseCursorFailedException,
  PostNotFoundException, SystemAdminNotFoundException, SystemErrorException, UserNotFoundException
} from '../app.exception'
import { CensorsService } from '../censors/censors.service'
import { CENSOR_SUGGESTION } from '../censors/models/censors.model'
import { ORDER_BY } from '../connections/models/connections.model'
import { PUB_SUB_KEY } from '../constants'
import { NlpService } from '../nlp/nlp.service'
import { NOTIFICATION_ACTION } from '../notifications/models/notifications.model'
import { IImage, Post, RelayPagingConfigArgs } from '../posts/models/post.model'
import {
  atob, btoa, DeletePrivateValue, edgifyByCreatedAt, handleRelayForwardAfter, imagesV2fy,
  imagesV2ToImages, now, relayfyArrayForward, relayfyArrayForwardByScore, RelayfyArrayParamByScore, sha1
} from '../tool'
import { User, UserWithFacets } from '../user/models/user.model'
import { Vote, VotesConnection } from '../votes/model/votes.model'
import {
  AddCommentArgs,
  Comment,
  CommentId,
  CommentsConnection,
  CommentsConnectionWithRelay,
  CommentToUnion,
  CommentWithTo
} from './models/comment.model'

@Injectable()
export class CommentService {
  private readonly dgraph: DgraphClient
  constructor (
    private readonly dbService: DbService,
    private readonly censorsService: CensorsService,
    private readonly nlpService: NlpService,
    @Inject(PUB_SUB_KEY) private readonly pubSub
  ) {
    this.dgraph = dbService.getDgraphIns()
  }

  async images (id: string): Promise<string[]> {
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(Comment)) {
          images as imagesV2 @filter(type(Image))
        }
        imagesV2(func: uid(images), orderasc: index) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{imagesV2: IImage[]}>({ query, vars: { $id: id } })

    return imagesV2ToImages(res.imagesV2)
  }

  async addCommentOnUser (id: string, { content, to, isAnonymous, images }: AddCommentArgs): Promise<CommentWithTo> {
    const query = `
      query v($id: string, $to: string) {
        # 系统 
        s(func: eq(userId, "system")) @filter(type(Admin)) { system as uid }
        # 评论创建者是否
        v(func: uid($id)) @filter(type(User)) { v as uid }
        # 被评论的评论（不包含被标记删除的评论）
        u(func: uid($to)) @filter(type(Comment) and not has(delete)) {
          # 评论存在
          u as uid
          # 被评论的评论的创建者
          creator @filter(type(User)) {
            uid: commentCreator as uid
          }
          # 被评论的评论的评论对象（限制为 Comment 以致不能在首级评论使用评论用户功能）
          ~comments @filter(type(Comment)) {
            uid: commentTo as uid
          }
          # 匿名信息
          anonymous @filter(type(Anonymous)) {
            id: anonymous as uid
          }
        }
        t(func: uid(commentTo)) { uid }
        # 评论者是否评论的创建者
        y(func: uid(u)) @filter(uid_in(creator, $id)) {
          y as uid
        }
      }
    `
    const imagesV2 = imagesV2fy(images)
    const textCensor = await this.censorsService.textCensor(content)
    const _sentiment = await this.nlpService.sentimentAnalysis(content)

    // 评论的删除信息
    const iDelete = {
      uid: '_:delete',
      'dgraph.type': 'Delete',
      creator: {
        uid: 'uid(system)'
      },
      to: {
        uid: '_:comment',
        delete: {
          uid: '_:delete'
        }
      }
    }
    // 评论的情感信息
    const sentiment = {
      uid: '_:sentiment',
      'dgraph.type': 'Sentiment',
      negative: _sentiment.negative,
      positive: _sentiment.positive,
      neutral: _sentiment.neutral,
      value: _sentiment.sentiment
    }
    // 评论的匿名信息
    const anonymous = {
      uid: '_:anonymous',
      'dgraph.type': 'Anonymous',
      creator: {
        uid: id
      },
      createdAt: now(),
      to: {
        uid: '_:comment'
      }
    }

    // 创建一条新评论（评论创建者存在、被评论的评论存在、系统管理员存在、被评论的评论的父对象是评论、非匿名评论）
    const condition1 = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(system), 1) and eq(len(commentTo), 1) and eq(len(anonymous), 0))'
    const mutation1 = {
      // 被评论的评论
      uid: 'uid(commentTo)',
      comments: {
        uid: '_:comment',
        'dgraph.type': 'Comment',
        content,
        images,
        createdAt: now(),
        // 被评论的对象为被评论的评论的创建者
        to: {
          uid: 'uid(commentCreator)'
        },
        // 评论的创建者
        creator: {
          uid: id
        },
        sentiment
      }
    }

    // 创建一条新评论（评论创建者存在、被评论的评论存在、系统管理员存在、被评论的评论的父对象是评论、匿名评论）
    const condition2 = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(system), 1) and eq(len(commentTo), 1) and eq(len(anonymous), 1))'
    const mutation2 = {
      // 被评论的评论
      uid: 'uid(commentTo)',
      comments: {
        uid: '_:comment',
        'dgraph.type': 'Comment',
        content,
        images,
        createdAt: now(),
        // 被评论的对象为被评论的评论的匿名信息
        to: {
          uid: 'uid(anonymous)'
        },
        // 评论的创建者
        creator: {
          uid: id
        },
        sentiment
      }
    }

    // 创建新通知（评论创建者存在、被评论的评论存在、系统管理员存在、被评论的评论的创建者不是当前评论的创建者）
    const condition3 = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(system), 1) and eq(len(y), 0) )'
    const mutation3 = {
      uid: '_:notification',
      'dgraph.type': 'Notification',
      createdAt: now(),
      to: {
        uid: 'uid(commentCreator)',
        notifications: {
          uid: '_:notification'
        }
      },
      about: {
        uid: '_:comment'
      },
      action: NOTIFICATION_ACTION.ADD_COMMENT_ON_USER,
      isRead: false
    }

    if (isAnonymous) {
      Object.assign(mutation1.comments, { anonymous })
    } else {
      Object.assign(mutation2, { creator: { uid: id } })
    }
    if ((imagesV2?.length ?? 0) !== 0) {
      Object.assign(mutation1.comments, { imagesV2 })
    }

    if (textCensor.suggestion === CENSOR_SUGGESTION.BLOCK) {
      Object.assign(mutation1.comments, { delete: iDelete })
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      // 系统管理员
      s: Array<{uid: string}>
      // 当前评论创建者
      v: Array<{uid: string}>
      // 被评论的评论
      u: Array<{
        uid: string
        creator: {uid: string}
        anonymous: {id: string}
      }>
      t: Array<{uid: string}>
      // 评论者是否评论的创建者
      y: Array<{uid: string}>
    }>({
      query,
      mutations: [
        { mutation: mutation1, condition: condition1 },
        { mutation: mutation2, condition: condition2 },
        { mutation: mutation3, condition: condition3 }
      ],
      vars: {
        $id: id,
        $to: to
      }
    })

    if (res.uids.get('notification')) {
      // 向websocket发送通知
      await this.pubSub.publish(
        'notificationsAdded',
        {
          notificationsAdded: {
            id: res.uids.get('notification'),
            createdAt: now(),
            action: NOTIFICATION_ACTION.ADD_COMMENT_ON_COMMENT,
            isRead: false,
            to: res.json.u[0]?.creator?.uid
          }
        }
      )
    }

    if (res.json.s.length !== 1) {
      throw new SystemAdminNotFoundException()
    }
    if (res.json.v.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (res.json.u.length !== 1) {
      throw new CommentNotFoundException(to)
    }
    if (res.json.t.length !== 1) {
      throw new CannotCommentUser()
    }

    const _id = res.uids.get('comment')
    if (!_id) throw new SystemErrorException()

    return {
      id: _id,
      content,
      createdAt: now(),
      to
    } as unknown as any
  }

  async addMentionOnUser (id: string, args: AddCommentArgs, toUser: string) {
    throw new Error('Method not implemented.')
  }

  async mentions (id: string, args: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
  }

  async findOriginPostByCommentId (id: string) {
    const query = `
      query v($id: string) {
        var(func: uid($id)) @recurse(depth: 100, loop: false) {
          p as ~comments
        }
        originPost(func: uid(p)) @filter(type(Post)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{originPost: Post[]}>({ query, vars: { $id: id } })
    return res.originPost[0]
  }

  async findCommentsByXidWithRelayForward (viewerId: string, xid: string, first: number, after: string | null): Promise<CommentsConnectionWithRelay> {
    const cannotViewDelete = `
      var(func: type(Comment)) @filter(uid_in(creator, $xid) and not has(delete) and not has(anonymous)) {
        p as uid
      }
    `
    // 用户本人能查看除了被自己删除的评论
    const canViewDelete = `
      var(func: type(Comment)) @filter(uid_in(creator, $xid)) {
        t as uid
        # 除去所有自己删除的评论
        d1 as delete @filter(uid_in(creator, $xid))
      }
      var(func: uid(t)) @filter(not uid_in(delete, uid(d1))) {
        p as uid
      }
    `
    const q1 = 'var(func: uid(comments), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($xid: string, $after: string) {
        ${viewerId === xid ? canViewDelete : cannotViewDelete}
        var(func: uid(p), orderdesc: createdAt) {
          comments as uid
        }
        ${after ? q1 : ''}

        totalCount(func: uid(comments)) { count(uid) }
        comments(func: uid(${after ? 'q' : 'comments'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startComment(func: uid(comments), first: -1) {
          id: uid
          createdAt
        }
        # 结束游标
        endComment(func: uid(comments), first: 1) {
          id: uid
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      comments: Comment[]
      startComment: Array<{id: string, createdAt: string}>
      endComment: Array<{id: string, createdAt: string}>
    }>({ query, vars: { $after: after, $xid: xid } })

    const totalCount = res.totalCount[0]?.count ?? 0
    const v = totalCount !== 0
    const startComment = res.startComment[0]
    const endComment = res.endComment[0]
    const lastComment = res.comments?.slice(-1)[0]

    const hasNextPage = endComment?.createdAt !== lastComment?.createdAt && endComment?.createdAt !== after && res.comments.length === first && totalCount !== first
    const hasPreviousPage = after !== startComment?.createdAt && !!after

    return {
      totalCount,
      edges: edgifyByCreatedAt(res.comments ?? []),
      pageInfo: {
        endCursor: atob(lastComment?.createdAt),
        startCursor: atob(res.comments[0]?.createdAt),
        hasNextPage: hasNextPage && v,
        hasPreviousPage: hasPreviousPage && v
      }
    }
  }

  async findCommentsByXidWithRelay (viewerId: string, id: string, { first, last, after, before, orderBy }: RelayPagingConfigArgs) {
    after = btoa(after)
    before = btoa(before)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.findCommentsByXidWithRelayForward(viewerId, id, first, after)
    }
  }

  async commentsWithRelayForward (id: string, first: number, after: string | null): Promise<CommentsConnectionWithRelay> {
    const q1 = 'var(func: uid(comments), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(Post) or type(Comment)) {
          comments as comments(orderdesc: createdAt) @filter(type(Comment) and not has(delete))
        }
        ${after ? q1 : ''}

        totalCount(func: uid(comments)) { count(uid) }
        comments(func: uid(${after ? 'q' : 'comments'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startPost(func: uid(comments), first: -1) {
          id: uid
          createdAt
        }
        # 结束游标
        endPost(func: uid(comments), first: 1) {
          id: uid
          createdAt
        }
      }
    `

    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      comments: Comment[]
      startPost: Array<{id: string, createdAt: string}>
      endPost: Array<{id: string, createdAt: string}>
    }>({ query, vars: { $id: id, $after: after } })

    return relayfyArrayForward<Comment>({
      totalCount: res.totalCount,
      objs: res.comments,
      startO: res.startPost,
      endO: res.endPost,
      first,
      after
    })
  }

  async trendingCommentsWithRelay (id: string, first: number, after: string | null): Promise<CommentsConnectionWithRelay> {
    const q1 = 'var(func: uid(comments), orderdesc: val(score), after: $after) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(Post) or type(Comment)) {
          comments as comments @filter(type(Comment) and not has(delete)) {
            c as count(comments @filter(type(Comment)))
            voteCount as count(votes @filter(type(Vote)))
            commentScore as math(c * 3)

            score as math(voteCount + commentScore)
          }
        } 
        ${after ? q1 : ''}
        totalCount(func: uid(comments)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'comments'}), orderdesc: val(score), first: ${first}) {
          id: uid
          score: val(score)
          expand(_all_)
        }
        startO(func: uid(comments), orderdesc: val(score), first: -1) { 
          createdAt
          score: val(score)
          id: uid
        }
        endO(func: uid(comments), orderdesc: val(score), first: 1) { 
          createdAt
          score: val(score)
          id: uid
        }
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParamByScore<Comment>>({
      query,
      vars: { $id: id, $after: after }
    })

    return relayfyArrayForwardByScore({
      ...res,
      first,
      after
    })
  }

  async commentsWithRelay (id: string, { first, after, orderBy }: RelayPagingConfigArgs): Promise<CommentsConnectionWithRelay> {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.commentsWithRelayForward(id, first, after)
    }
    if (first && orderBy === ORDER_BY.TRENDING) {
      if (after) {
        try {
          after = JSON.parse(after).id
        } catch {
          throw new ParseCursorFailedException(after ?? '')
        }
      }

      return await this.trendingCommentsWithRelay(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async anonymous (id: string) {
    const query = `
      query v($commentId: string) {
        # 原帖子 id
        var(func: uid($commentId)) @recurse(depth: 100, loop: false) {
          p as ~comments
        }
        originPost(func: uid(p)) @filter(type(Post)) {
          id: uid
        }
        comment(func: uid($commentId)) @filter(type(Comment)) {
          creator @filter(type(User)) {
            id: uid
            subCampus
          }
          # 被评论的对象的id
          to @filter(type(Post) or type(Comment)) {
            id: uid
          }
          anonymous @filter(type(Anonymous)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      originPost: Array<{id: string}>
      comment: Array<{to: {id: string}, creator: {id: string, subCampus: string}, anonymous: Anonymous}>
    }>({ query, vars: { $commentId: id } })

    const anonymous = res.comment[0]?.anonymous
    const creatorId = res.comment[0]?.creator?.id
    const originPostId = res.originPost[0]?.id
    const subCampus = res.comment[0]?.creator?.subCampus

    if (anonymous) {
      anonymous.watermark = sha1(`${originPostId}${creatorId}`)
      anonymous.subCampus = subCampus
    }

    return anonymous
  }

  async commentsCreatedWithin (startTime: string, endTime: string, first: number, offset: number): Promise<CommentsConnection> {
    const query = `
      query v($startTime: string, $endTime: string) {
        var(func: type(Comment)) @filter(not has(delete)) {
          a as creator @filter(not eq(openId, "") and not eq(unionId, "")) {
            q as math(1)
          }
        }
        creator as var(func: uid(a)) @filter(eq(val(q), 1))
        c as var(func: type(Comment)) @filter(uid_in(creator, uid(creator)))
        var(func: between(createdAt, $startTime, $endTime)) @filter(uid(c)) {
          comments as uid
        }
        totalCount(func: uid(comments)) {
          count(uid)
        }
        comments(func: uid(comments), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      comments: Comment[]
    }>({ query, vars: { $startTime: startTime, $endTime: endTime } })

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.comments ?? []
    }
  }

  async findCommentsByUid (viewerId: string, id: string, first: number, offset: number): Promise<CommentsConnection> {
    const q1 = `
      totalCount(func: type(Comment)) @filter(uid_in(creator, $uid)) {
        uids as uid
        count(uid)
      }
      `
    // 非本人不能查看被删除和匿名评论
    const q2 = `
      totalCount(func: type(Comment)) @filter(uid_in(creator, $uid) and not has(delete) and not has(anonymous)) {
        uids as uid
        count(uid)
      }
      `
    const query = `
        query v($uid: string) {
          ${viewerId === id ? q1 : q2}
          comments(func: uid(uids), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
            id: uid
            expand(_all_)
          }
        }
      `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      comments: Comment[]
    }>({ query, vars: { $uid: id } })

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.comments ?? []
    }
  }

  async to (id: string) {
    const query = `
      query v($commentId: string) {
        var(func: uid($commentId)) @recurse(depth: 100, loop: false) {
          p as ~comments
        }
        originalPost(func: uid(p)) @filter(type(Post)) {
          id: uid
        }
        comment(func: uid($commentId)) @filter(type(Comment)) {
          to @filter(type(Post) or type(Comment) or type(User) or type(Anonymous)) {
            id: uid
            expand(_all_)
            dgraph.type
            creator @filter(type(User)) {
              id: uid
              subCampus
            }
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      originalPost: Array<{id: string}>
      comment: Array<{to: (typeof CommentToUnion) & {
        'dgraph.type': string[]
        creator: {
          id: string
          subCampus: string
        }
      }}>
    }>({ query, vars: { $commentId: id } })

    const originalPostId = res.originalPost[0]?.id
    const creatorId = res.comment[0]?.to?.creator?.id
    const subCampus = res.comment[0]?.to?.creator?.subCampus

    // TODO 直接将 watermark、subCampus 信息存 Anonymous 而不是运行时计算
    const to = res.comment[0]?.to
    if (to?.['dgraph.type']?.includes('Anonymous')) {
      ;(to as unknown as Anonymous).watermark = sha1(`${originalPostId}${creatorId}`)
      ;(to as unknown as Anonymous).subCampus = subCampus
    }
    return res.comment[0]?.to
  }

  async deletedComments (first: number, offset: number): Promise<CommentsConnection> {
    const query = `
      {
        var(func: type(Comment)) @filter(has(delete)) { v as uid }
        deletedComments(func: uid(v), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
          id: uid
          expand(_all_)
        }
        totalCount(func: uid(v)) { count(uid) }
      }
    `
    const res = await this.dbService.commitQuery<{
      deletedComments: Comment[]
      totalCount: Array<{count: number}>
    }>({ query })

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.deletedComments ?? []
    }
  }

  async trendingComments (id: string, first: number, offset: number): Promise<CommentsConnection> {
    const query = `
      # TODO 实现产品中要求的计算评论热度的方法
      query v($commentId: string) {
        var(func: uid($commentId)) @filter(type(Comment)) {
          comments as comments @filter(type(Comment) and not has(delete)) {
            c as count(comments @filter(type(Comment)))
            voteCount as count(votes @filter(type(Vote)))
            commentScore as math(c * 3)
            createdAt as createdAt

            hour as math (
              0.75 * (since(createdAt)/216000)
            )
            score as math((voteCount + commentScore) * hour)
          }
        }
        totalCount(func: uid(comments)) { count(uid) }
        comments(func: uid(comments), orderdesc: val(score), first: ${first}, offset: ${offset}) {
          val(score)
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      comments: Comment[]
    }>({ query, vars: { $commentId: id } })

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.comments ?? []
    }
  }

  async creator (id: string) {
    const query = `
      query v($commentId: string) {
        comment (func: uid($commentId)) @filter(type(Comment) and not has(anonymous)) {
          creator @filter(type(User)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{comment: Array<{creator: UserWithFacets}>}>({ query, vars: { $commentId: id } })
    const creator = res.comment[0]?.creator
    return DeletePrivateValue<User>(creator)
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

          totalCount(func: uid(A)) @filter(type(Comment) and not uid($uid) and not has(delete)) {
            count(uid)
          }

          comment(func: uid($uid)) @filter(type(Comment)){
            comments (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Comment) and not has(delete)) {
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

  async addCommentOnComment (creator: string, { content, to: commentId, isAnonymous, images }: AddCommentArgs): Promise<CommentWithTo> {
    const _now = now()

    const query = `
        query v($creator: string, $commentId: string) {
          # 系统 
          s(func: eq(userId, "system")) @filter(type(Admin)) { system as uid }
          # 评论创建者存在
          v(func: uid(${creator})) @filter(type(User)) { v as uid }
          u(func: uid(${commentId})) @filter(type(Comment)) {
            # 评论存在
            u as uid
            # 评论的创建者
            creator @filter(type(User)) {
              uid: commentCreator as uid
            }
          }
          # 评论者是否评论的创建者
          y(func: uid($commentId)) @filter(type(Comment) and uid_in(creator, $creator)) {
            y as uid
          }
        }
      `
    const imagesV2 = imagesV2fy(images)

    const textCensor = await this.censorsService.textCensor(content)
    const _sentiment = await this.nlpService.sentimentAnalysis(content)

    // 评论的删除信息
    const iDelete = {
      uid: '_:delete',
      'dgraph.type': 'Delete',
      creator: {
        uid: 'uid(system)'
      },
      to: {
        uid: '_:comment',
        delete: {
          uid: '_:delete'
        }
      }
    }
    // 评论的情感信息
    const sentiment = {
      uid: '_:sentiment',
      'dgraph.type': 'Sentiment',
      negative: _sentiment.negative,
      positive: _sentiment.positive,
      neutral: _sentiment.neutral,
      value: _sentiment.sentiment
    }
    // 评论的匿名信息
    const anonymous = {
      uid: '_:anonymous',
      'dgraph.type': 'Anonymous',
      creator: {
        uid: creator
      },
      createdAt: _now,
      to: {
        uid: '_:comment'
      }
    }

    // 创建一条新评论
    const condition1 = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(system), 1) )'
    const mutation1 = {
      // 被评论的评论
      uid: commentId,
      comments: {
        uid: '_:comment',
        'dgraph.type': 'Comment',
        content,
        images,
        createdAt: _now,
        // 被评论的对象
        to: {
          uid: commentId
        },
        // 评论的创建者
        creator: {
          uid: creator
        },
        sentiment
      }
    }

    const condition2 = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(system), 1) and eq(len(y), 0) )'
    const mutation2 = {
      uid: '_:notification',
      'dgraph.type': 'Notification',
      createdAt: _now,
      to: {
        uid: 'uid(commentCreator)',
        notifications: {
          uid: '_:notification'
        }
      },
      about: {
        uid: '_:comment'
      },
      action: NOTIFICATION_ACTION.ADD_COMMENT_ON_COMMENT,
      isRead: false
    }

    if (isAnonymous) {
      Object.assign(mutation1.comments, { anonymous })
    } else {
      Object.assign(mutation2, { creator: { uid: creator } })
    }

    if ((imagesV2?.length ?? 0) !== 0) {
      Object.assign(mutation1.comments, { imagesV2 })
    }

    if (textCensor.suggestion === CENSOR_SUGGESTION.BLOCK) {
      Object.assign(mutation1.comments, { delete: iDelete })
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string, creator: {uid: string}}>
      s: Array<{uid: string}>
      y: Array<{uid: string}>
    }>({
      mutations: [
        { mutation: mutation1, condition: condition1 },
        { mutation: mutation2, condition: condition2 }
      ],
      query,
      vars: {
        $creator: creator,
        $commentId: commentId
      }
    })

    if (res.uids.get('notification')) {
      // 向websocket发送通知
      await this.pubSub.publish(
        'notificationsAdded',
        {
          notificationsAdded: {
            id: res.uids.get('notification'),
            createdAt: _now,
            action: NOTIFICATION_ACTION.ADD_COMMENT_ON_COMMENT,
            isRead: false,
            to: res.json.u[0]?.creator?.uid
          }
        }
      )
    }

    if (res.json.s.length !== 1) {
      throw new SystemAdminNotFoundException()
    }
    if (res.json.v.length !== 1) {
      throw new UserNotFoundException(creator)
    }
    if (res.json.u.length !== 1) {
      throw new CommentNotFoundException(commentId)
    }

    const _id = res.uids.get('comment')
    if (!_id) throw new SystemErrorException()

    return {
      content,
      createdAt: _now,
      id: _id,
      to: commentId
    } as unknown as any
  }

  async addCommentOnPost (creator: string, { content, to: postId, isAnonymous, images }: AddCommentArgs): Promise<CommentWithTo> {
    const _now = now()
    const condition1 = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(system), 1) )'
    const query = `
      query v($creator: string, $postId: string) {
        # 系统
        s(func: eq(userId, "system")) @filter(type(Admin)) { system as uid }
        # 评论的创建者存在
        v(func: uid($creator)) @filter(type(User)) { v as uid }
        u(func: uid($postId)) @filter(type(Post)) { 
          # 帖子存在
          u as uid 
          # 帖子的创建者
          creator @filter(type(User)) {
            uid: postCreator as uid
          }
        }
        # 评论者是帖子的创建者
        y(func: uid($postId)) @filter(type(Post) and uid_in(creator, $creator)) {
          y as uid
        }
      }
    `
    const imagesV2 = imagesV2fy(images)

    // 审查内容
    const textCensor = await this.censorsService.textCensor(content)
    const _sentiment = await this.nlpService.sentimentAnalysis(content)

    // 评论的删除信息
    const iDelete = {
      uid: '_:delete',
      'dgraph.type': 'Delete',
      createdAt: _now,
      to: {
        uid: '_:comment',
        delete: {
          uid: '_:delete'
        }
      },
      creator: {
        uid: 'uid(system)'
      }
    }

    // 评论的情感信息
    const sentiment = {
      uid: '_:sentiment',
      'dgraph.type': 'Sentiment',
      negative: _sentiment.negative,
      neutral: _sentiment.neutral,
      positive: _sentiment.positive,
      value: _sentiment.sentiment
    }

    // 评论的匿名信息
    const anonymous = {
      uid: '_:anonymous',
      'dgraph.type': 'Anonymous',
      creator: {
        uid: creator
      },
      createdAt: _now,
      to: {
        uid: '_:comment'
      }
    }

    // 创建一条新的评论
    const mutation1 = {
      uid: postId,
      comments: {
        uid: '_:comment',
        'dgraph.type': 'Comment',
        content,
        images,
        createdAt: _now,
        // 被评论的对象
        to: {
          uid: postId,
          comments: {
            uid: '_:comment'
          }
        },
        creator: {
          uid: creator
        },
        sentiment
      }
    }

    // 评论自己的帖子不发通知
    const condition2 = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(system), 1) and eq(len(y), 0) )'
    // 创建通知
    const mutation2 = {
      uid: '_:notification',
      'dgraph.type': 'Notification',
      createdAt: _now,
      to: {
        uid: 'uid(postCreator)',
        notifications: {
          uid: '_:notification'
        }
      },
      about: {
        uid: '_:comment'
      },
      action: NOTIFICATION_ACTION.ADD_COMMENT_ON_POST,
      isRead: false
    }

    if (isAnonymous) {
      Object.assign(mutation1.comments, { anonymous })
    } else {
      // 非匿名发布评论添加通知创建者信息
      Object.assign(mutation2, { creator: { uid: creator } })
    }

    if ((imagesV2?.length ?? 0) !== 0) {
      Object.assign(mutation1.comments, { imagesV2 })
    }

    if (textCensor.suggestion === CENSOR_SUGGESTION.BLOCK) {
      Object.assign(mutation1.comments, { delete: iDelete })
    }

    // TODO 将疑似违规帖子添加到复查队列

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      s: Array<{uid: string}>
      v: Array<{uid: string}>
      u: Array<{uid: string, creator: {uid: string}}>
    }>({
      mutations: [
        { mutation: mutation1, condition: condition1 },
        { mutation: mutation2, condition: condition2 }
      ],
      query,
      vars: {
        $creator: creator,
        $postId: postId
      }
    })

    if (res.uids.get('notification')) {
      // 向websocket发送通知
      await this.pubSub.publish(
        'notificationsAdded',
        {
          notificationsAdded: {
            id: res.uids.get('notification'),
            createdAt: _now,
            action: NOTIFICATION_ACTION.ADD_COMMENT_ON_POST,
            isRead: false,
            to: res.json.u[0]?.creator?.uid
          }
        }
      )
    }

    if (res.json.s.length !== 1) {
      throw new SystemAdminNotFoundException()
    }

    if (res.json.v.length !== 1) {
      throw new UserNotFoundException(creator)
    }

    if (res.json.u.length !== 1) {
      throw new PostNotFoundException(postId)
    }

    const _id = res.uids.get('comment')
    if (!_id) throw new SystemErrorException()

    return {
      content,
      createdAt: _now,
      id: _id,
      to: postId
    } as unknown as any
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

  async getVotesByCommentId (viewerId: string, id: string, first: number, offset: number): Promise<VotesConnection> {
    if (!viewerId) {
      // 未登录时
      const query = `
        query v($commentId: string) {
          v(func: uid($commentId)) @filter(type(Comment)) {
            totalCount: count(votes @filter(type(Vote)))
          }
          u(func: uid($commentId)) @filter(type(Comment)) {
            votes (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Vote)) {
              id: uid
              expand(_all_)
            }
          }
        }
      `
      const res = await this.dbService.commitQuery<{
        v: Array<{totalCount: number}>
        u: Array<{votes: Vote[]}>
      }>({ query, vars: { $commentId: id } })
      return {
        totalCount: res.v[0]?.totalCount ?? 0,
        nodes: res.u[0]?.votes ?? [],
        viewerCanUpvote: true,
        viewerHasUpvoted: false
      }
    }
    const query = `
      query v($commentId: string, $viewerId: string) {
        v(func: uid($commentId)) @filter(type(Comment)) {
          totalCount: count(votes @filter(type(Vote)))
          canVote: votes @filter(uid_in(creator, $viewerId)) {
            uid
          }
        }
        u(func: uid($commentId)) @filter(type(Comment)) {
          votes (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Vote)) {
            id: uid
            expand(_all_)
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
