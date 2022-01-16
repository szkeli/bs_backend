import { ArgsType, Field, ObjectType, registerEnumType } from '@nestjs/graphql'

import { Node } from '../../node/models/node.model'

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
