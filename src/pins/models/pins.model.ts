import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class Pin {
  @Field()
    id: string

  @Field()
    createdAt: string
}
