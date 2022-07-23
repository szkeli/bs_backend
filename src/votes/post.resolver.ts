import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { SystemErrorException } from '../app.exception'
import { CurrentUser } from '../auth/decorator'
import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { Post, RelayPagingConfigArgs } from '../posts/models/post.model'
import { relayfyArrayForward } from '../tool'
import { User } from '../user/models/user.model'
import { Vote, VotesConnectionWithRelay } from './model/votes.model'

@Resolver(of => Post)
export class PostResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => VotesConnectionWithRelay, { description: '帖子的点赞' })
  async votesWithRelay (@CurrentUser() user: User, @Parent() post: Post, @Args() args: RelayPagingConfigArgs) {
    const viewerId = user?.id
    const postId = post.id
    const { first, after, orderBy } = args
    if (viewerId && first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.votesWithViewerIdWithRelayForward(viewerId, postId, first, after)
    }

    if (!viewerId && first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.votesWithRelayForward(postId, first, after)
    }

    throw new SystemErrorException()
  }

  async votesWithViewerIdWithRelayForward (viewerId: string, id: string, first: number, after: string | null): Promise<VotesConnectionWithRelay> {
    const q1 = 'var(func: uid(votes), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $viewerId: string, $after: string) {
        var(func: uid($id)) @filter(type(Post)) {
          votes as votes (orderdesc: createdAt) @filter(type(Vote))
        }
        # viewer是否已经点赞
        v(func: uid(votes)) @filter(uid_in(creator, $viewerId)) { uid }
        ${after ? q1 : ''}
        totalCount(func: uid(votes)) { count(uid) }
        votes(func: uid(${after ? 'q' : 'votes'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startVote(func: uid(votes), first: -1) {
          createdAt
        }
        # 结束游标
        endVote(func: uid(votes), first: 1) {
          createdAt
        }
      }
    `

    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startVote: Array<{createdAt: string}>
      endVote: Array<{createdAt: string}>
      votes: Vote[]
      v: Array<{uid: string}>
    }>({
      query,
      vars: {
        $id: id,
        $after: after,
        $viewerId: viewerId
      }
    })

    const can = res.v.length === 0

    return {
      ...relayfyArrayForward({
        totalCount: res.totalCount,
        startO: res.startVote,
        endO: res.endVote,
        objs: res.votes,
        first,
        after
      }),
      viewerCanUpvote: can,
      viewerHasUpvoted: !can
    }
  }

  async votesWithRelayForward (id: string, first: number, after: string | null): Promise<VotesConnectionWithRelay> {
    const q1 = 'var(func: uid(votes), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(Post)) {
          votes as votes (orderdesc: createdAt) @filter(type(Vote))
        }
        ${after ? q1 : ''}
        totalCount(func: uid(votes)) { count(uid) }
        votes(func: uid(${after ? 'q' : 'votes'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startVote(func: uid(votes), first: -1) {
          createdAt
        }
        # 结束游标
        endVote(func: uid(votes), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startVote: Array<{createdAt: string}>
      endVote: Array<{createdAt: string}>
      votes: Vote[]
    }>({ query, vars: { $id: id, $after: after } })

    return {
      ...relayfyArrayForward({
        totalCount: res.totalCount,
        startO: res.startVote,
        endO: res.endVote,
        objs: res.votes,
        first,
        after
      }),
      viewerCanUpvote: true,
      viewerHasUpvoted: false
    }
  }
}
