import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class Anonymous {
  @Field()
    id: string

  @Field()
    createdAt: string

  @Field()
    watermark: string
}
