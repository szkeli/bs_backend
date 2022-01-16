import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class Message {
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
