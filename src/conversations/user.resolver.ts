import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { Person, User } from '../user/models/user.model'
import { UserService } from '../user/user.service'
import { ConversationsConnection } from './models/conversations.model'

@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly userService: UserService) {}

  @ResolveField(of => ConversationsConnection, { description: '当前用户创建的所有会话' })
  async conversations (@Parent() user: User, @Args() args: RelayPagingConfigArgs) {
    return await this.userService.conversations(user, args)
  }
}
