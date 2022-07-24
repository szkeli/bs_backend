import { ForbiddenException } from '@nestjs/common'
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { NoAuth } from '../auth/decorator'
import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { Subject } from '../subject/model/subject.model'
import { edgifyByKey, getCurosrByScoreAndId, handleRelayForwardAfter, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { PagingConfigArgs } from '../user/models/user.model'
import { Post, PostsConnection, PostsConnectionWithRelay, RelayPagingConfigArgs } from './models/post.model'

@Resolver(of => Subject)
export class SubjectResolver {
  constructor (private readonly dbService: DbService) {}

  @Query(of => PostsConnectionWithRelay, { description: 'Relay版 以id获取某主题下所有帖子', deprecationReason: '请使用 subjects.postsWithRelay' })
  @NoAuth()
  async subjectPostsWithRelay (@Args('id') id: string, @Args() paging: RelayPagingConfigArgs) {
    return await this.postsWithRelay({ id } as unknown as any, paging)
  }

  @ResolveField(of => PostsConnection, { description: '当前主题中的所有帖子', deprecationReason: '请使用 postsWithRelay' })
  async posts (@Parent() subject: Subject, @Args() args: PagingConfigArgs): Promise<PostsConnection> {
    const { id } = subject
    const { first, offset } = args
    const query = `
        query v($uid: string) {
          var(func: uid($uid)) {
            posts as posts @filter(not has(delete))
          }
          totalCount(func: uid(posts)) {count(uid)}
          posts(func: uid(posts), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
            id: uid
            expand(_all_)
          }
        }
      `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      posts: Post[]
    }>({ query, vars: { $uid: id } })

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.posts ?? []
    }
  }

  @ResolveField(of => PostsConnectionWithRelay)
  async postsWithRelay (@Parent() subject: Subject, @Args() paging: RelayPagingConfigArgs) {
    const { id } = subject
    let { first, after, orderBy } = paging
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.postsWithRelayForward(id, first, after)
    }

    if (first && orderBy === ORDER_BY.TRENDING) {
      if (after) {
        try {
          after = JSON.parse(after).score
        } catch {
          throw new ForbiddenException(`解析游标失败 ${after ?? ''}`)
        }
      }
      return await this.trendingPostsWithRelayForward(id, first, after)
    }
  }

  async postsWithRelayForward (subjectId: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(posts), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($subjectId: string, $after: string) {
        var(func: uid($subjectId)) @filter(type(Subject)) {
          posts as posts(orderdesc: createdAt) @filter(not has(delete))
        }

        ${after ? q1 : ''}
        totalCount(func: uid(posts)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'posts'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(posts), first: -1) {
          createdAt
        }
        endO(func: uid(posts), first: 1) {
          createdAt
        }
      }
    `

    const res = await this.dbService.commitQuery<RelayfyArrayParam<Post>>({ query, vars: { $subjectId: subjectId, $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async trendingPostsWithRelayForward (subjectId: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(posts), orderdesc: val(score)) @filter(lt(val(score), $after)) { q as uid }'
    const query = `
      query v($subjectId: string, $after: string) {
        var(func: uid($subjectId)) @filter(not has(delete)) {
          tposts as posts @filter(not has(delete))  
        }

        v as var(func: uid(tposts)) @filter(not has(delete)) {
          voteCount as count(votes @filter(type(Vote)))
          # TODO
          c as count(comments @filter(type(Comment)))
          commentsCount as math(c * 3)
          createdAt as createdAt
        
          hour as math(
            0.75*(since(createdAt)/216000)
          )
          score as math((voteCount + commentsCount)* hour)
        }
        posts as var(func: uid(v)) @filter(gt(val(score), 0))

        ${after ? q1 : ''}
        
        totalCount(func: uid(posts)) { count(uid) }
        posts(func: uid(${after ? 'q' : 'posts'}), orderdesc: val(score), first: ${first}) {
          score: val(score)
          id: uid
          expand(_all_)
        }
        # 开始游标
        startPost(func: uid(posts), orderdesc: val(score), first: 1) {
          id: uid
          score: val(score)
        }
        # 结束游标
        endPost(func: uid(posts), orderdesc: val(score), first: -1) {
          id: uid
          score: val(score)
        }
      }
    `

    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      posts: Array<Post & {score: number}>
      startPost: Array<{score: number}>
      endPost: Array<{score: number}>
    }>({ query, vars: { $after: after, $subjectId: subjectId } })

    const totalCount = res.totalCount[0]?.count ?? 0
    const v = totalCount !== 0

    const firstPost = res.posts[0]
    const lastPost = res.posts?.slice(-1)[0]
    const startPost = res.startPost[0]
    const endPost = res.endPost[0]
    const startCursor = getCurosrByScoreAndId(firstPost?.id, firstPost?.score)
    const endCursor = getCurosrByScoreAndId(lastPost?.id, lastPost?.score)

    const hasNextPage = endPost?.score !== lastPost?.score && res.posts.length === first && endPost?.score?.toString() !== after
    const hasPreviousPage = after !== startPost?.score?.toString() && !!after

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      edges: edgifyByKey(res.posts ?? [], 'score'),
      pageInfo: {
        startCursor,
        endCursor,
        hasNextPage: hasNextPage && v,
        hasPreviousPage: hasPreviousPage && v
      }
    }
  }
}
