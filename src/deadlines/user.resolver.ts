import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { Person, User } from '../user/models/user.model'
import { UserService } from '../user/user.service'
import { DeadlinesConnection } from './models/deadlines.model'

@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly userService: UserService) {}

  @ResolveField(of => DeadlinesConnection, { description: '当前用户的deadlines' })
  async deadlines (@Parent() user: User, @Args() args: RelayPagingConfigArgs) {
    return await this.userService.deadlines(user.id, args)
  }
}
