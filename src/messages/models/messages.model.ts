import { Field, Int, ObjectType } from '@nestjs/graphql'

import { Node } from '../../node/models/node.model'

@ObjectType({
  implements: [Node]
})
export class Message implements Node {
  constructor (message: Message) {
    Object.assign(this, message)
  }

  @Field()
    id: string

  @Field()
    createdAt: string

  @Field()
    content: string
}

@ObjectType()
export class MessagesConnection {
  @Field(type => [Message])
    nodes: Message[]

  @Field(type => Int)
    totalCount: number
}
