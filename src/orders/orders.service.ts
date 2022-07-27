import { ForbiddenException, Injectable, NotImplementedException } from '@nestjs/common'

import { ExceedRedeenCountException, OrderHasBeenTakenException, OrderNotFoundException, OrderPickUpErrorException, UserNotFoundException } from '../app.exception'
import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService, Txn } from '../db/db.service'
import { handleRelayForwardAfter, now, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { User } from '../user/models/user.model'
import { OrderPickUp } from './models/order-pick-up.model'
import { CancelPickUpArgs, ORDER_TYPE, OrdersFilter, OrderUnion, PickUpOrderArgs, ReserveAmountsRng } from './models/orders.model'

@Injectable()
export class OrdersService {
  constructor (private readonly dbService: DbService) {}

  async orders (args: RelayPagingConfigArgs, filter: OrdersFilter) {
    let { first, after, orderBy } = args
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.ordersRelayForward(after, first, filter)
    }
    throw new NotImplementedException()
  }

  // TODO: 解决注入风险
  handleOrdersFilter (filter: OrdersFilter) {
    const { type, orderDestination, reserveAmountsRng } = filter

    // entrypoint
    const orderTypeHandler = (type: ORDER_TYPE | null) => {
      const retName = 'orderTypeHandlerRet'
      if (!type) {
        return [`
        var(func: type(TakeAwayOrder)) { takeaway as uid }
        var(func: type(IdleItemOrder)) { idleitem as uid }
        var(func: type(TeamUpOrder)) { teamup as uid }
        var(func: uid(takeaway, idleitem, teamup)) { ${retName} as uid }
        `, retName]
      }
      const map = {
        [ORDER_TYPE.IDLEITEM]: ['var(func: type(IdleItemOrder)) { idleitem as uid }', 'idleitem'],
        [ORDER_TYPE.TAKEAWAY]: ['var(func: type(TakeAwayOrder)) { takeaway as uid }', 'takeaway'],
        [ORDER_TYPE.TEAM_UP]: ['var(func: type(TeamUpOrder)) { teamup as uid }', 'teamup']
      }
      return [`
        ${map[type][0]}
        var(func: uid(${map[type][1]})) { ${retName} as uid }
      `, retName]
    }

    const orderDestinationHandler = (destination: string | null, last: string[]) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_v, r] = last
      const retName = 'orderDestinationHandlerRet'
      if (!destination) {
        return [`
          var(func: uid(${r})) { ${retName} as uid }
        `, retName]
      }

      return [`
        var(func: uid(${r})) @filter(anyoftext(orderDestination, "${destination}")) {
          ${retName} as uid
        } 
      `, retName]
    }

    const reserveAmountsHandler = (reserveAmountsRng: ReserveAmountsRng | null, last: string[]) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_v, r] = last
      const retName = 'reserveAmountsHandlerRet'
      if (!reserveAmountsRng) {
        return [`
          var(func: uid(${r})) { ${retName} as uid }
        `, retName]
      }
      const { max, min } = reserveAmountsRng
      return [`
        var(func: uid(${r})) @filter(between(reserveAmounts, ${min}, ${max})) {
          ${retName} as uid
        }
      `, retName]
    }

    const a = orderTypeHandler(type)
    const b = orderDestinationHandler(orderDestination, a)
    const c = reserveAmountsHandler(reserveAmountsRng, b)

    return [`
      ${a[0]}
      ${b[0]}
      ${c[0]}
    `,
    c[1]
    ]
  }

  async ordersRelayForward (after: string | null, first: number, filter: OrdersFilter) {
    const [r, v] = this.handleOrdersFilter(filter)
    const q1 = 'var(func: uid(orders), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($after: string) {
        ${r}

        var(func: uid(${v})) { orders as uid }

        ${after ? q1 : ''}

        totalCount(func: uid(orders)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'orders'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
          dgraph.type
        }
        startO(func: uid(orders), first: -1) { createdAt }
        endO(func: uid(orders), first: 1) { createdAt }
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<typeof OrderUnion>>({
      query,
      vars: { $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async findOrderByPostId (id: string): Promise<typeof OrderUnion> {
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(Post)) {
          o as ~post @filter(type(TakeAwayOrder) or type(IdleItemOrder) or type(TeamUpOrder))
        }
        o(func: uid(o)) {
          id: uid
          expand(_all_)
          dgraph.type
        }
      }
    `
    const res = await this.dbService.commitQuery<{o: Array<typeof OrderUnion>}>({ query, vars: { $id: id } })
    return res.o[0]
  }

  /**
   * 取消一个接单
   * 1. 被取消的订单有接单
   * 2. 被取消的订单的接单者是取消者
   * 3. 被去取消的订单的可接单次数加一
   * @param user 操作者
   * @param args 被操作的订单
   */
  async cancelPickUpOrder (user: User, args: CancelPickUpArgs) {
    await this.dbService.withTxn(async txn => {
      await this.cancelPickUpTxn(txn, user, args)
      await this.addRedeemCountTxn(txn, args)
    })

    return true
  }

  // 订单可接单次数加一
  async addRedeemCountTxn (txn: Txn, args: CancelPickUpArgs) {
    const { orderId } = args
    const query = `
      query v($orderId: string) {
        o(func: uid($orderId)) {
          o as uid
          redeemCounts as redeemCounts
          newRedeemCounts as math(redeemCounts + 1)
        }
      }
    `
    const mut = {
      uid: 'uid(o)',
      redeemCounts: 'val(newRedeemCounts)'
    }
    await this.dbService.handleTransaction(txn, {
      query,
      mutations: [{ set: mut }],
      vars: { $orderId: orderId }
    })
  }

  // 取消一个订单
  async cancelPickUpTxn (txn: Txn, user: User, args: CancelPickUpArgs) {
    const { id } = user
    const { orderId } = args
    const query = `
      query v($id: string, $orderId: string) {
        u(func: uid($id)) @filter(type(User)) { u as uid }
        o(func: uid($orderId)) @filter(type(TakeAwayOrder) or type(IdleItemOrder) or type(TeamUpOrder)) { 
          o as uid 
        }
        # 订单是否有接单
        up(func: uid(o)) @filter(has(pickUp)) { 
          up as uid
          p as pickUp @filter(type(OrderPickUp))
        }
        # 订单的接单者是否操作者
        is(func: uid(p)) @filter(uid_in(creator, uid(u))) { is as uid }
      }
    `
    const condition = `
      @if(
        eq(len(u), 1) and 
        eq(len(o), 1) and 
        eq(len(up), 1) and
        eq(len(is), 1)
      )
    `
    // 删除相应的 OrderPickUp
    const del = {
      uid: 'uid(o)',
      pickUp: {
        uid: 'uid(p)'
      }
    }
    const res = await this.dbService.handleTransaction<{}, {
      u: Array<{uid: string}>
      o: Array<{uid: string}>
      up: Array<{uid: string}>
      is: Array<{uid: string}>
    }>(txn, {
      query,
      mutations: [
        { del, cond: condition }
      ],
      vars: { $id: id, $orderId: orderId }
    })
    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (res.json.o.length !== 1) {
      throw new OrderNotFoundException(orderId)
    }
    if (res.json.up.length !== 1) {
      throw new OrderHasBeenTakenException(orderId)
    }
    if (res.json.is.length !== 1) {
      throw new ForbiddenException('订单的接单者不是当前用户')
    }
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
        up(func: uid(o)) {
          pickUp @filter(type(OrderPickUp)) {
            up as uid
          }
        }
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
