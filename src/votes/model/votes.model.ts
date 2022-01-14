import { Field, InputType, Int, InterfaceType } from '@nestjs/graphql'

import { CommentId } from 'src/comment/models/comment.model'
import { PostId } from 'src/db/model/db.model'

@InputType()
export class VoteAPostInput {
  @Field()
    to?: PostId
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

@InterfaceType()
export abstract class Votable {
  @Field(type => Int, { description: 'Number of upvotes that this node has received.' })
    upvoteCount: number

  @Field(type => Boolean, { description: 'Whether or not the current user can add or remove an upvote on this node.' })
    viewerCanUpvote: boolean

  @Field(type => Boolean, { description: 'Whether or not the current user has already upvoted this node.' })
    viewerHasUpvoted: boolean
}
