import { Resolver } from '@nestjs/graphql'

import { OrdersService } from './orders.service'

@Resolver()
export class OrdersResolver {
  constructor (private readonly ordersService: OrdersService) {}
}
