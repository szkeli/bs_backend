import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { User } from '../user/models/user.model'
import { OrderPickUp } from './models/order-pick-up.model'
import { OrderPickUpService } from './order-pick-up.service'

@Resolver(of => OrderPickUp)
export class OrderPickUpResolver {
  constructor (private readonly orderPickUpService: OrderPickUpService) {}
  @ResolveField(of => User)
  async creator (@Parent() orderPickUp: OrderPickUp) {
    return await this.orderPickUpService.creator(orderPickUp)
  }
}
