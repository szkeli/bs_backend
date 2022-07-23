import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { Person, User } from '../user/models/user.model'
import { UserService } from '../user/user.service'
import { RolesConnection } from './models/roles.model'

@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly userService: UserService) {}

  @ResolveField(of => RolesConnection, { description: '当前用户的所有角色' })
  async roles (@Parent() user: User, @Args() args: RelayPagingConfigArgs) {
    return await this.userService.roles(user.id, args)
  }
}
