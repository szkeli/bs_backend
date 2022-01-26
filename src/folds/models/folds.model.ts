import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class Fold {
  @Field()
    id: string

  @Field()
    createdAt: string
}

@ObjectType()
export class FoldsConnection {
  @Field(type => [Fold])
    nodes: Fold[]

  @Field(type => Int)
    totalCount: number
}
