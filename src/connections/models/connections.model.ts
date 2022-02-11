import { Type } from '@nestjs/common'
import { Field, Int, ObjectType } from '@nestjs/graphql'
import { Connection as RelayConnection, Edge as RelayEdge, PageInfo as RelayPageInfo } from 'graphql-relay'

export function Connection<GraphQLObject> (GenericClass?: Type<GraphQLObject>) {
  @ObjectType(`${GenericClass.name}PageInfo`, { isAbstract: true })
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

  @ObjectType(`${GenericClass.name}Edge`, { isAbstract: true })
  abstract class Edge<GraphQLObject> implements RelayEdge<GraphQLObject> {
    @Field(of => GenericClass, { nullable: true })
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

  return IConnection as unknown as new () => {
    edges: Array<{node: GraphQLObject, cursor: string}>
    pageInfo: {
      startCursor: string
      endCursor: string
      hasNextPage: boolean
      hasPreviousPage: boolean
    }
    totalCount: number
  }
}
