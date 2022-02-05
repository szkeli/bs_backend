import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class Pin {
  @Field()
    id: string

  @Field()
    createdAt: string
}

@ObjectType()
export class PinsConnection {
  @Field(of => Int)
    totalCount: number

  @Field(of => [Pin])
    nodes: Pin[]
}
