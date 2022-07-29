import { NotImplementedException } from '@nestjs/common'
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { handleRelayForwardAfter, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { User } from '../user/models/user.model'
import { Votable, Vote, VotesConnectionWithRelay } from './model/votes.model'

@Resolver(of => Votable)
export class VotableInterfaceResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => VotesConnectionWithRelay)
  async votes (
  @CurrentUser() user: User,
    @Parent() votable: Votable,
    @Args() args: RelayPagingConfigArgs
  ) {
    const viewerId = user?.id
    const id = votable.id
    let { first, after, orderBy } = args
    after = handleRelayForwardAfter(after)

    if (viewerId && first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.votesWithViewerIdWithRelayForward(viewerId, id, first, after)
    }
    if (!viewerId && first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.votesWithRelayForward(id, first, after)
    }
    throw new NotImplementedException()
  }

  async votesWithViewerIdWithRelayForward (
    viewerId: string,
    id: string,
    first: number,
    after: string | null
  ): Promise<VotesConnectionWithRelay> {
    const q1 =
      'var(func: uid(votes), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $viewerId: string, $after: string) {
        var(func: uid($id)) @filter(type(Post) or type(Comment)) {
          votes as votes (orderdesc: createdAt) @filter(type(Vote))
        }
        # viewer是否已经点赞
        v(func: uid(votes)) @filter(uid_in(creator, $viewerId)) { uid }
        ${after ? q1 : ''}
        totalCount(func: uid(votes)) { count(uid) }
        objs(func: uid(${
          after ? 'q' : 'votes'
        }), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(votes), first: -1) {
          createdAt
        }
        endO(func: uid(votes), first: 1) {
          createdAt
        }
      }
    `

    const res = await this.dbService.commitQuery<
    RelayfyArrayParam<Vote> & {
      v: Array<{ uid: string }>
    }
    >({
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
        ...res,
        first,
        after
      }),
      viewerCanUpvote: can,
      viewerHasUpvoted: !can
    }
  }

  async votesWithRelayForward (
    id: string,
    first: number,
    after: string | null
  ): Promise<VotesConnectionWithRelay> {
    const q1 =
      'var(func: uid(votes), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(Post) or type(Comment)) {
          votes as votes (orderdesc: createdAt) @filter(type(Vote))
        }
        ${after ? q1 : ''}
        totalCount(func: uid(votes)) { count(uid) }
        objs(func: uid(${
          after ? 'q' : 'votes'
        }), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(votes), first: -1) {
          createdAt
        }
        endO(func: uid(votes), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Vote>>({ query, vars: { $id: id, $after: after } })

    return {
      ...relayfyArrayForward({
        ...res,
        first,
        after
      }),
      viewerCanUpvote: true,
      viewerHasUpvoted: false
    }
  }
}
