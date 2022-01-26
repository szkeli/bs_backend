import { Field, Int, ObjectType } from '@nestjs/graphql'

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
export class BlocksConnection {
  @Field(type => [Block])
    nodes: Block[]

  @Field(type => Int)
    totalCount: number
}
