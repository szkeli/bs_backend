import { ArgsType, Field, ObjectType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

@ObjectType()
export class Block {
  @Field()
    id: string

  @Field()
    createdAt: string

  @Field()
    description: string
}

@ObjectType()
export class BlocksConnection extends Connection<Block>(Block) {}

@ArgsType()
export class AddBlockOnUserArgs {
  @Field()
    id: string

  @Field()
    description: string
}
