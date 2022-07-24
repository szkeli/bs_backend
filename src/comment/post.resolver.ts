import { NotImplementedException } from '@nestjs/common'
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { Post, RelayPagingConfigArgs } from '../posts/models/post.model'
import { handleRelayForwardAfter, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { PagingConfigArgs } from '../user/models/user.model'
import { CommentService } from './comment.service'
import {
  Comment,
  CommentsConnection,
  CommentsConnectionWithRelay
} from './models/comment.model'

@Resolver(of => Post)
export class PostResolver {
  constructor (
    private readonly commentService: CommentService,
    private readonly dbService: DbService
  ) {}

  @ResolveField(of => CommentsConnection, {
    description: '帖子的所有评论',
    deprecationReason: '请使用commentsWithRelay'
  })
  async comments (
  @Parent() post: Post,
    @Args() { first, offset }: PagingConfigArgs
  ) {
    return await this.commentService.findCommentsByPostId(
      post.id.toString(),
      first,
      offset
    )
  }

  @ResolveField(of => CommentsConnectionWithRelay, {
    description: '获取所有评论'
  })
  async commentsWithRelay (
  @Parent() post: Post,
    @Args() paging: RelayPagingConfigArgs
  ) {
    return await this.commentService.commentsWithRelay(post.id, paging)
  }

  @ResolveField(of => CommentsConnection, { description: '帖子的折叠评论' })
  async foldedComments (
  @Parent() post: Post,
    @Args() { first, offset }: PagingConfigArgs
  ) {
    const { id } = post
    const query = `
      query v($postId: string) {
        post(func: uid($postId)) @filter(type(Post)) {
          count: count(comments @filter(has(fold)))
          comments (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(has(fold)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      post: Array<{ count: number, comments?: Comment[] }>
    }>({ query, vars: { $postId: id } })
    return {
      totalCount: res.post[0]?.count ?? 0,
      nodes: res.post[0]?.comments ?? []
    }
  }

  @ResolveField(of => CommentsConnectionWithRelay, {
    description: '帖子的所有折叠评论'
  })
  async foldedCommentsWithRelay (
  @Parent() post: Post,
    @Args() paging: RelayPagingConfigArgs
  ) {
    const { id } = post
    let { first, after, orderBy } = paging
    after = handleRelayForwardAfter(after)

    if (first && ORDER_BY.CREATED_AT_DESC === orderBy) {
      return await this.foldedCommentsWithRelayForward(id, first, after)
    }
    throw new NotImplementedException()
  }

  @ResolveField(of => CommentsConnection, { description: '按热度返回评论' })
  async trendingComments (
  @Parent() post: Post,
    @Args() { first, offset }: PagingConfigArgs
  ) {
    const { id } = post
    const query = `
      query v($postId: string) {
        var(func: uid($postId)) @filter(type(Post)) {
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
      totalCount: Array<{ count: number }>
      comments: Comment[]
    }>({ query, vars: { $postId: id } })

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.comments ?? []
    }
  }

  async foldedCommentsWithRelayForward (
    postId: string,
    first: number,
    after: string | null
  ) {
    const q1 =
      'var(func: uid(comments), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($postId: string, $after: string) {
        var(func: uid($postId)) @filter(type(Post)) {
          comments as comments (orderdesc: createdAt) @filter(type(Comment) and has(fold))
        }

        ${after ? q1 : ''}
        totalCount(func: uid(comments)) {
          count(uid)
        }
        objs(func: uid(${
          after ? 'q' : 'comments'
        }), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startO(func: uid(comments), first: -1) {
          createdAt
        }
        # 结束游标
        endO(func: uid(comments), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Comment>>({
      query,
      vars: { $postId: postId, $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }
}
