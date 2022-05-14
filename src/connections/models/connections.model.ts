import { Type } from '@nestjs/common'
import { ArgsType, Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql'
import { Connection as RelayConnection, Edge as RelayEdge, PageInfo as RelayPageInfo } from 'graphql-relay'

export enum ORDER_BY {
  // 按热度排序
  TRENDING = 'TRENDING',
  // 时间倒序
  CREATED_AT_DESC = 'CREATED_AT_DESC'
}

registerEnumType(ORDER_BY, {
  name: 'ORDER_BY'
})

export class ValueRef {
  constructor (ref: ValueRef) {
    Object.assign(this, ref)
  }

  value: any
  name: string
}

interface IEdgeType<T> {
  cursor: string
  node: T
}

interface IPageInfoType {
  startCursor: string
  endCursor: string
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface IPainatedType<T> {
  edges: Array<IEdgeType<T>>
  totalCount: number
  pageInfo: IPageInfoType
}

export function Connection<GraphQLObject> (Ref: Type<GraphQLObject> | ValueRef) {
  @ObjectType(`${Ref.name}PageInfo`, { isAbstract: true })
  abstract class PageInfo implements RelayPageInfo {
    @Field(of => String, { nullable: true })
      startCursor: string

    @Field(of => String, { nullable: true })
      endCursor: string

    @Field(of => Boolean, { nullable: false })
      hasPreviousPage: boolean

    @Field(of => Boolean, { nullable: false })
      hasNextPage: boolean
  }

  @ObjectType(`${Ref.name}Edge`, { isAbstract: true })
  abstract class Edge<GraphQLObject> implements RelayEdge<GraphQLObject> {
    @Field(of => (Ref instanceof ValueRef ? Ref.value : Ref), { nullable: true })
      node: GraphQLObject

    @Field(of => String, { nullable: true })
      cursor: string
  }

  @ObjectType({ isAbstract: true })
  abstract class IConnection implements RelayConnection<GraphQLObject> {
    @Field(of => [Edge], { nullable: false })
      edges: Array<RelayEdge<GraphQLObject>>

    @Field(of => PageInfo, { nullable: false })
      pageInfo: PageInfo

    @Field(of => Int, { nullable: false })
      totalCount: number
  }

  return IConnection as Type<IPainatedType<GraphQLObject>>
}

@ArgsType()
export class RelayPagingConfigArgs {
  @Field(of => Int, { description: '最新的n个对象', nullable: true, defaultValue: 10 })
    first?: number

  @Field(of => String, { description: '向前分页游标', nullable: true })
    after?: string

  @Field(of => Int, { description: '最早的n个对象', nullable: true })
    last?: number

  @Field(of => String, { description: '向后分页游标', nullable: true })
    before?: string

  @Field(of => ORDER_BY, { description: '排序方式', nullable: true, defaultValue: ORDER_BY.CREATED_AT_DESC })
    orderBy?: ORDER_BY
}
