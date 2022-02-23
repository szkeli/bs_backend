import { Field, ObjectType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

@ObjectType()
export class Pin {
  @Field()
    id: string

  @Field()
    createdAt: string
}

@ObjectType()
export class PinsConnection extends Connection<Pin>(Pin) {}
