import { Field, ObjectType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

@ObjectType()
export class Fold {
  @Field()
    id: string

  @Field()
    createdAt: string
}

@ObjectType()
export class FoldsConnection extends Connection<Fold>(Fold) {}
