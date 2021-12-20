import { Field, InputType } from '@nestjs/graphql'

@InputType()
export class CommentAvgAggregateInput {
  @Field(() => Boolean, { nullable: true })
    id?: true

  @Field(() => Boolean, { nullable: true })
    replyToId?: true
}
