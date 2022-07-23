import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Post } from '../posts/models/post.model'
import { OrderUnion } from './models/orders.model'
import { OrdersService } from './orders.service'

@Resolver(of => Post)
export class PostResolver {
  constructor (private readonly orderService: OrdersService) {}

  @ResolveField(of => OrderUnion, { description: '当前帖子携带的订单', nullable: true })
  async order (@Parent() post: Post): Promise<typeof OrderUnion> {
    return await this.orderService.findOrderByPostId(post.id)
  }
}
