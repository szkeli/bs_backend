import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class OrderPickUp {
  @Field(of => String)
    id: string

  @Field(of => String)
    createdAt: string
}
