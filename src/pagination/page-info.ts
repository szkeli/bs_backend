import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class PageInfo {
  @Field(() => Boolean)
    hasNextPage: boolean

  @Field(() => Boolean)
    hasPreviousPage: boolean

  @Field(() => String, { nullable: true })
    startCursor?: string

  @Field(() => String, { nullable: true })
    endCursor?: string
}
