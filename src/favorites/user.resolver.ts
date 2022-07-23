import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { Person, User } from '../user/models/user.model'
import { UserService } from '../user/user.service'
import { FavoritesConnection } from './models/favorite.model'

@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly userService: UserService) {}

  @ResolveField(of => FavoritesConnection)
  async favorites (@Parent() user: User, @Args() args: RelayPagingConfigArgs) {
    return await this.userService.favorites(user, args)
  }
}
