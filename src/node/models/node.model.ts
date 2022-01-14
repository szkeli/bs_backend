import { Field, Int, InterfaceType, ObjectType } from '@nestjs/graphql'

import { PageInfo } from '../../user/models/user.model'

@InterfaceType()
export abstract class Node {
  @Field(type => String)
    id: string
}

export type NodeId = string

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
