import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { Person, User } from '../user/models/user.model'
import { UserService } from '../user/user.service'
import { OrdersConnection } from './models/orders.model'

@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly userService: UserService) {}
  @ResolveField(of => OrdersConnection, { description: '当前用户的所有订单' })
  async orders (@Parent() user: User, @Args() args: RelayPagingConfigArgs) {
    return await this.userService.orders(user, args)
  }
}
