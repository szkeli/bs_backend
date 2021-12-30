import { Field, InputType } from '@nestjs/graphql'

import { CommentId } from 'src/comment/models/comment.model'
import { PostId, UserId } from 'src/db/model/db.model'

@InputType()
export class VoteAPostInput {
  @Field()
    to: PostId
}

@InputType()
export class VoteACommentInput {
  @Field()
    to: CommentId
}

@InputType()
export class UnvoteACommentInput extends VoteACommentInput {}
@InputType()
export class UnvoteAPostInput extends VoteAPostInput {}
