import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class View {
  @Field()
    id: string

  @Field()
    createdAt: string
}
