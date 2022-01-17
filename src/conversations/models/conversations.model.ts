import { ArgsType, createUnionType, Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

import { Message } from '../../messages/models/messages.model'
import { Node } from '../../node/models/node.model'
import { Report } from '../../reports/models/reports.model'
import { User } from '../../user/models/user.model'

export type ConversationId = string

export enum CONVERSATION_STATE {
  RUNNING = 'RUNNING',
  CLOSE = 'CLOSE'
}

registerEnumType(CONVERSATION_STATE, {
  name: 'CONVERSATION_STATE'
})

@ObjectType({
  implements: [Node]
})
export class Conversation implements Node {
  @Field()
    id: string

  @Field()
    createdAt: string

  @Field()
    title: string

  @Field()
    description: string

  @Field(type => CONVERSATION_STATE)
    state: CONVERSATION_STATE
}

@ArgsType()
export class CreateConversationArgs {
  @Field()
    title: string

  @Field()
    description: string

  @Field(type => [String])
    participants: string[]
}

@ObjectType()
export class MessageItemConnection {
  @Field(type => [MessageItem])
    nodes: Array<typeof MessageItem>

  @Field(type => Int)
    totalCount: number
}

export const MessageItem = createUnionType({
  name: 'MessageItem',
  types: () => [Message, Report]
})

@ObjectType()
export class ParticipantsConnection {
  @Field(type => [User])
    nodes: User[]

  @Field(type => Int)
    totalCount: number
}

@ObjectType()
export class ConversationsConnection {
  @Field(type => [Conversation])
    nodes: Conversation[]

  @Field(type => Int)
    totalCount: number
}
