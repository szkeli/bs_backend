import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class Delete {
  @Field()
    id: string

  @Field()
    createdAt: string
}
