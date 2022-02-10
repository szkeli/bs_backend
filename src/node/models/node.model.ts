import { ArgsType, Field, Int, InterfaceType, ObjectType } from '@nestjs/graphql'

@InterfaceType()
export abstract class Node {
  @Field(type => String)
    id: string
}

export type NodeId = string

@ObjectType()
export class PageInfo {
  @Field({ nullable: true })
    endCursor?: string

  @Field(of => Boolean)
    hasNextPage: boolean

  @Field(of => Boolean)
    hasPreviousPage: boolean

  @Field(of => String, { nullable: true })
    startCursor?: string
}

@ObjectType()
export class NodesConnection {
  @Field(type => [NodeEdge])
    edges: [NodeEdge]

  @Field(type => [Node])
    nodes: [Node]

  @Field(type => PageInfo)
    pageInfo: PageInfo

  @Field(type => Int)
    totalCount: number
}

@ObjectType()
export class NodeEdge {
  @Field(type => String)
    cursor: string

  @Field(type => Node)
    node: Node
}

@ArgsType()
export class WithinArgs {
  @Field()
    startTime: string

  @Field()
    endTime: string
}
