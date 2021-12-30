import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'

import { ORDERBY } from 'src/user/models/user.model'

export type CommentId = string

@ObjectType()
export class Comment {
  @Field()
    id: CommentId

  @Field()
    content: string

  @Field()
    createAt: string

  @Field(type => Int)
    voteCount: number

  @Field(type => Int)
    commentCount: number
}

@InputType()
export class AddACommentOnCommentInput {
  @Field()
    to: CommentId

  @Field()
    content: string
}

@InputType()
export class AddACommentOnPostInput {
  @Field()
    to: CommentId

  @Field()
    content: string
}

@InputType()
export class PagingConfigInput {
  @Field(type => Int, { defaultValue: 0 })
    skip: number

  @Field(type => Int, { defaultValue: 10 })
    limit: number

  @Field(type => ORDERBY, { defaultValue: ORDERBY.DESC })
    orderBy: ORDERBY
}
