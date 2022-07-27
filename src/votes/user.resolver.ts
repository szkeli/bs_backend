import { NotImplementedException } from '@nestjs/common'
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { handleRelayForwardAfter, relayfyArrayForward } from '../tool'
import { PagingConfigArgs, Person, User } from '../user/models/user.model'
import { Vote, VotesConnection, VotesConnectionWithRelay } from './model/votes.model'
import { VotesService } from './votes.service'

@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly votesService: VotesService, private readonly dbService: DbService) {}

  @ResolveField(of => VotesConnection, { description: '当前用户的所有点赞' })
  async votes (@Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
    return await this.votesService.findVotesByUid(user.id, first, offset)
  }

  @ResolveField(of => VotesConnectionWithRelay, { description: '当前用户的所有点赞' })
  async votesWithRelay (@Parent() user: User, @Args() args: RelayPagingConfigArgs) {
    const { id } = user
    let { first, after, orderBy } = args
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.votesWithRelayForward(id, first, after)
    }
    throw new NotImplementedException()
  }

  async votesWithRelayForward (id, first: number, after: string | null): Promise<VotesConnectionWithRelay> {
    const q1 = 'var(func: uid(votes), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(User)) {
          votes as votes (orderdesc: createdAt) @filter(type(Vote))
        }
        ${after ? q1 : ''}
        totalCount(func: uid(votes)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'votes'}), orderdesc: createdAt, first: ${first}) {
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
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startO: Array<{createdAt: string}>
      endO: Array<{createdAt: string}>
      objs: Vote[]
    }>({ query, vars: { $id: id, $after: after } })

    return {
      ...relayfyArrayForward({
        ...res,
        first,
        after
      }),
      viewerCanUpvote: false,
      viewerHasUpvoted: true
    }
  }
}
