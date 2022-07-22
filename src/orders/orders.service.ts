import { Injectable } from '@nestjs/common'

import { ExceedRedeenCountException, OrderHasBeenTakenException, OrderNotFoundException, OrderPickUpErrorException, UserNotFoundException } from '../app.exception'
import { DbService } from '../db/db.service'
import { Post } from '../posts/models/post.model'
import { now } from '../tool'
import { User } from '../user/models/user.model'
import { OrderPickUp } from './models/order-pick-up.model'
import { OrderUnion, PickUpOrderArgs } from './models/orders.model'

@Injectable()
export class OrdersService {
  constructor (private readonly dbService: DbService) {}

  async post (order: typeof OrderUnion) {
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

  async pickUp (order: typeof OrderUnion): Promise<OrderPickUp> {
    const { id } = order
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(TeamUpOrder) or type(IdleItemOrder) or type(TakeAwayOrder)) {
          p as pickUp @filter(type(OrderPickUp)) 
        }
        pickUp(func: uid(p)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{pickUp: OrderPickUp[]}>({
      query,
      vars: { $id: id }
    })

    return res.pickUp[0]
  }

  /**
   * 接单函数
   * 1. 接单人不是订单发起者
   * 2. 订单剩余被接单次数大于0
   * 3. 订单没有被接单
   * 4. 当前时间大于订单的有效时间
   * @param user 接单用户
   * @param args 被接单信息
   */
  async pickUpOrder ({ id }: User, { orderId }: PickUpOrderArgs) {
    const query = `
      query v($id: string, $orderId: string) {
        u(func: uid($id)) @filter(type(User)) { u as uid }
        o(func: uid($orderId)) @filter(type(TakeAwayOrder) or type(IdleItemOrder) or type(TeamUpOrder)) { o as uid }
        var(func: uid(o)) {
          post @filter(type(Post)) {
            postCreator as creator @filter(not uid(u))
          }
          redeemCounts as redeemCounts
          newRedeemCounts as math(redeemCounts - 1)
        }
        # 接单人是否订单创建者
        p(func: uid(postCreator)) { n as uid }
        g(func: uid(o)) @filter(gt(redeemCounts, 0)) { g as uid }
        # 订单是否已被接单
        up(func: uid(o)) @filter(has(pickUp)) { up as uid }
        order(func:uid(o)) {
          id: uid
          expand(_all_)
          dgraph.type
        }
      }
    `
    const condition = `@if( 
      eq(len(u), 1) and 
      eq(len(o), 1) and 
      eq(len(n), 1) and 
      eq(len(g), 1) and 
      eq(len(up), 0) 
    )`
    const mutation = {
      uid: 'uid(o)',
      redeemCounts: 'val(newRedeemCounts)',
      pickUp: {
        uid: '_:order_pick_up',
        'dgraph.type': 'OrderPickUp',
        creator: {
          uid: 'uid(u)'
        },
        order: {
          uid: 'uid(o)'
        },
        createdAt: now()
      }
    }
    const res = await this.dbService.commitConditionalUperts<{}, {
      u: Array<{uid: string}>
      o: Array<{uid: string}>
      p: Array<{uid: string}>
      g: Array<{uid: string}>
      up: Array<{uid: string}>
      order: Array<typeof OrderUnion>
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: { $id: id, $orderId: orderId }
    })
    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (res.json.o.length !== 1) {
      throw new OrderNotFoundException(orderId)
    }
    if (res.json.p.length !== 1) {
      throw new OrderPickUpErrorException()
    }
    if (res.json.g.length !== 1) {
      throw new ExceedRedeenCountException()
    }
    if (res.json.up.length !== 0) {
      throw new OrderHasBeenTakenException(orderId)
    }

    return res.json.order[0]
  }
}
