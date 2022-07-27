import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { User } from '../user/models/user.model'
import { OrderPickUp } from './models/order-pick-up.model'
import { CancelPickUpArgs, Order, OrdersConnection, OrdersFilter, OrderUnion, PickUpOrderArgs } from './models/orders.model'
import { OrdersService } from './orders.service'

@Resolver(of => Order)
export class OrdersResolver {
  constructor (private readonly ordersService: OrdersService) {
  }

  @Query(of => OrdersConnection, { description: '筛选顶订单' })
  async orders (@Args() args: RelayPagingConfigArgs, @Args() filter: OrdersFilter) {
    return await this.ordersService.orders(args, filter)
  }

  @Mutation(of => OrderUnion, { description: '接单' })
  async pickUpOrder (@CurrentUser() user: User, @Args() args: PickUpOrderArgs) {
    return await this.ordersService.pickUpOrder(user, args)
  }

  @Mutation(of => Boolean, { description: '取消一个接单' })
  async cancelPickUpOrder (@CurrentUser() user: User, @Args() args: CancelPickUpArgs) {
    return await this.ordersService.cancelPickUpOrder(user, args)
  }

  @ResolveField(of => OrderPickUp, { description: '当前订单的接单情况', nullable: true })
  async pickUp (@Parent() order: typeof OrderUnion) {
    return await this.ordersService.pickUp(order)
  }
}
