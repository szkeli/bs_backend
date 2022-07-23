import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Order, OrderUnion } from '../orders/models/orders.model'
import { Post } from './models/post.model'

@Resolver(of => Order)
export class OrderResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => Post, { description: '携带该订单的 Post' })
  async post (@Parent() order: typeof OrderUnion) {
    const { id } = order
    const query = `
      query v($id: string) {
        var(func: uid($id)) {
          p as post @filter(type(Post)) 
        }
        post(func: uid(p)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{post: Post[]}>({
      query,
      vars: { $id: id }
    })
    return res.post[0]
  }
}
