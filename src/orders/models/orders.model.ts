import { createUnionType, Field, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

export enum TAKEAWAY_ORDER_TYPE {
  EXPRESS_DELIVERY = 'EXPRESS_DELIVERY',
  TAKEOUT = 'TAKEOUT',
  OTHER = 'OTHER'
}

registerEnumType(TAKEAWAY_ORDER_TYPE, {
  name: 'TAKEAWAY_ORDER_TYPE',
  valuesMap: {
    EXPRESS_DELIVERY: {
      description: '快递'
    },
    TAKEOUT: {
      description: '外卖'
    },
    OTHER: {
      description: '其它'
    }
  }
})

export enum IDLEITEM_TYPE {
  ELECTRONIC_PRODUCT = 'ELECTRONIC_PRODUCT',
  DAILY_NECESSITIES = 'DAILY_NECESSITIES'
}

registerEnumType(IDLEITEM_TYPE, {
  name: 'IDLEITEM_TYPE',
  valuesMap: {
    ELECTRONIC_PRODUCT: {
      description: '电子产品'
    },
    DAILY_NECESSITIES: {
      description: '生活用品'
    }
  }
})

export enum TEAM_UP_TYPE {
  CARPOOL = 'CARPOOL',
  GROUP = 'GROUP'
}

registerEnumType(TEAM_UP_TYPE, {
  name: 'TEAM_UP_TYPE',
  valuesMap: {
    CARPOOL: {
      description: '拼车'
    },
    GROUP: {
      description: '拼团'
    }
  }
})

@ObjectType({
  description: '有偿代拿的订单'
})
export class TakeAwayOrder {
  @Field(of => String)
    id: string

  @Field(of => TAKEAWAY_ORDER_TYPE, { description: '代拿类型' })
    type: TAKEAWAY_ORDER_TYPE

  @Field(of => String, { description: '所在地（起点）', nullable: true })
    orderStartingPoint: string | null

  @Field(of => String, { description: '目的地（终点）', nullable: true })
    orderDestination: string | null

  @Field(of => String, { description: '联系方式', nullable: true })
    contactInfo: string | null

  @Field(of => String, { description: '最晚送达时间', nullable: true })
    endTime: string | null

  @Field(of => Int, { description: '金额，以分为单位' })
    reserveAmounts: number

  @Field(of => String, { description: '订单结束时间' })
    expiredAt: string

  @Field(of => String, { description: '订单创建时间' })
    createdAt: string

  @Field(of => Int, { description: '订单的可接单次数' })
    redeemCounts: number
}

@InputType({ description: '创建 有偿代拿 的订单，对于 type === TAKEAWAY_ORDER_TYPE.OTHER 的订单，相关字段会被忽略' })
export class CreateTakeAwayOrderArgs {
  @Field(of => TAKEAWAY_ORDER_TYPE, { description: '代拿类型' })
    type: TAKEAWAY_ORDER_TYPE

  @Field(of => String, { description: '所在地（起点）', nullable: true })
    orderStartingPoint: string | null

  @Field(of => String, { description: '目的地（终点）', nullable: true })
    orderDestination: string | null

  @Field(of => String, { description: '联系方式', nullable: true })
    contactInfo: string | null

  @Field(of => String, { description: '最晚送达时间', nullable: true })
    endTime: string | null

  @Field(of => Int, { description: '金额，以分为单位' })
    reserveAmounts: number

  @Field(of => String, { description: '订单结束时间' })
    expiredAt: string

  @Field(of => Int, { description: '订单的可接单次数' })
    redeemCounts: number
}

@InputType({ description: '創建 閑置 的訂單' })
export class CreateIdleItemOrderArgs {
  @Field(of => IDLEITEM_TYPE, { description: '閑置類型' })
    idleItemType: IDLEITEM_TYPE

  @Field(of => String, { description: '目的地（终点）' })
    orderDestination: string

  @Field(of => Int, { description: '金额，以分为单位' })
    reserveAmounts: number

  @Field(of => String, { description: '联系方式', nullable: true })
    contactInfo: string | null

  @Field(of => Int, { description: '订单的可接单次数' })
    redeemCounts: number

  @Field(of => String, { description: '订单结束时间' })
    expiredAt: string
}

@InputType({ description: '創建 組隊 訂單' })
export class CreateTeamUpOrderArgs {
  @Field(of => TEAM_UP_TYPE, { description: '組隊類型' })
    type: TEAM_UP_TYPE

  @Field(of => String, { description: '所在地（起点）', nullable: true })
    orderStartingPoint: string | null

  @Field(of => String, { description: '目的地（终点）', nullable: true })
    orderDestination: string | null

  @Field(of => String, { description: '出發時間' })
    departureTime: string

  @Field(of => Int, { description: '金额，以分为单位' })
    reserveAmounts: number

  @Field(of => String, { description: '联系方式', nullable: true })
    contactInfo: string | null

  @Field(of => Int, { description: '订单的可接单次数' })
    redeemCounts: number

  @Field(of => String, { description: '订单结束时间' })
    expiredAt: string
}

@ObjectType({
  description: '二手闲置的订单'
})
export class IdleItemOrder {
  @Field(of => String)
    id: string

  @Field(of => String, { description: '目的地（终点）' })
    orderDestination: string

  @Field(of => IDLEITEM_TYPE, { description: '闲置类别' })
    idleItemType: IDLEITEM_TYPE

  @Field(of => Int, { description: '金额，以分为单位' })
    reserveAmounts: number

  @Field(of => String, { description: '订单结束时间' })
    expiredAt: string

  @Field(of => String, { description: '订单创建时间' })
    createdAt: string

  @Field(of => Int, { description: '订单的可接单次数' })
    redeemCounts: number
}

@ObjectType({
  description: '拼车组队订单'
})
export class TeamUpOrder {
  @Field(of => String)
    id: string

  @Field(of => TEAM_UP_TYPE, { description: '组队类型' })
    type: TEAM_UP_TYPE

  @Field(of => String, { description: '所在地（起点）', nullable: true })
    orderStartingPoint: string

  @Field(of => String, { description: '目的地（终点）', nullable: true })
    orderDestination: string

  @Field(of => String, { description: '出发时间', nullable: true })

  @Field(of => Int, { description: '金额，以分为单位', nullable: true })
    reserveAmounts: number

  @Field(of => String, { description: '订单结束时间' })
    expiredAt: string

  @Field(of => String, { description: '订单创建时间' })
    createdAt: string

  @Field(of => Int, { description: '订单的可接单次数' })
    redeemCounts: number
}

export const OrderUnion = createUnionType({
  name: 'OrderUnion',
  types: () => [TakeAwayOrder, IdleItemOrder, TeamUpOrder],
  resolveType: (v: {'dgraph.type': ['TakeAwayOrder', 'IdleItemOrder', 'TeamUpOrder']}) => {
    if (v['dgraph.type']?.includes('TakeAwayOrder')) {
      return TakeAwayOrder
    }
    if (v['dgraph.type']?.includes('IdleItemOrder')) {
      return IdleItemOrder
    }
    if (v['dgraph.type']?.includes('TeamUpOrder')) {
      return TeamUpOrder
    }
  }
})
