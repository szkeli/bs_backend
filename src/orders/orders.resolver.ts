import { Args, Mutation, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { Post } from '../posts/models/post.model'
import { User } from '../user/models/user.model'
import { OrderPickUp } from './models/order-pick-up.model'
import { Order, OrderUnion, PickUpOrderArgs } from './models/orders.model'
import { OrdersService } from './orders.service'

@Resolver(of => Order)
export class OrdersResolver {
  constructor (private readonly ordersService: OrdersService) {
  }

  @Mutation(of => OrderUnion, { description: '接单' })
  async pickUpOrder (@CurrentUser() user: User, @Args() args: PickUpOrderArgs) {
    // TODO: 完全实现此函数
    return await this.ordersService.pickUpOrder(user, args)
  }

  @ResolveField(of => OrderPickUp, { description: '当前订单的接单情况', nullable: true })
  async pickUp (@Parent() order: typeof OrderUnion) {
    return await this.ordersService.pickUp(order)
  }

  @ResolveField(of => Post, { description: '携带该订单的 Post' })
  async post (@Parent() order: typeof OrderUnion) {
    return await this.ordersService.post(order)
  }
}
