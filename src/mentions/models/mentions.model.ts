import { Field, ObjectType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

@ObjectType()
export class Mention {
  @Field()
    id: string

  @Field({ description: '创建时间' })
    createdAt: string
}

@ObjectType()
export class MentionsConnection extends Connection<Mention>(Mention) {}
