import { ArgsType, createUnionType, Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

import { Connection, ValueRef } from '../../connections/models/connections.model'
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

export const MessageItem = createUnionType({
  name: 'MessageItem',
  types: () => [Message, Report],
  resolveType: (v: {'dgraph.type': ['Message', 'Report']}) => {
    if (v['dgraph.type']?.includes('Message')) {
      return Message
    }
    if (v['dgraph.type']?.includes('Report')) {
      return Report
    }
  }
})

@ObjectType()
export class MessageItemsConnection extends Connection(new ValueRef({
  value: MessageItem,
  name: 'MessageItem'
})) {}

@ObjectType()
export class ParticipantsConnection {
  @Field(type => [User])
    nodes: User[]

  @Field(type => Int)
    totalCount: number
}

@ObjectType()
export class ConversationsConnection extends Connection<Conversation>(Conversation) {}
