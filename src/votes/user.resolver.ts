import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { PagingConfigArgs, Person, User } from '../user/models/user.model'
import { UserService } from '../user/user.service'
import { VotesConnection, VotesConnectionWithRelay } from './model/votes.model'
import { VotesService } from './votes.service'

@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly votesService: VotesService, private readonly userService: UserService) {}
  @ResolveField(of => VotesConnection, { description: '当前用户的所有点赞' })
  async votes (@Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
    return await this.votesService.findVotesByUid(user.id, first, offset)
  }

  @ResolveField(of => VotesConnectionWithRelay, { description: '当前用户的所有点赞' })
  async votesWithRelay (@Parent() user: User, @Args() args: RelayPagingConfigArgs) {
    return await this.userService.votesWithRelay(user.id, args)
  }
}
