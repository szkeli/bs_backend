import { ArgsType, createUnionType, Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

import { Admin } from '../../admin/models/admin.model'
import { Conversation } from '../../conversations/models/conversations.model'
import { Node } from '../../node/models/node.model'
import { User } from '../../user/models/user.model'

export enum MESSAGE_TYPE {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VOICE = 'VOICE',
  RICH_TEXT = 'RICH_TEXT'
}

registerEnumType(MESSAGE_TYPE, {
  name: 'MESSAGE_TYPE'
})

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

export const MessageReciverUnion = createUnionType({
  name: 'MessageRevicerUnion',
  types: () => [User, Conversation]
})

export const MessageCreatorUnion = createUnionType({
  name: 'MessageCreatorUnion',
  types: () => [User, Admin]
})

@ArgsType()
export class AddMessageArgs {
  @Field(of => String, { description: 'Conversation ID' })
    conversationId: string

  @Field(of => String, { description: 'The content of current message' })
    content: string
}
