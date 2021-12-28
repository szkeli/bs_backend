import { Field, InputType } from "@nestjs/graphql";
import { CommentId } from "src/comment/models/comment.model";
import { PostId, UserId } from "src/db/db.service";

@InputType()
export class VoteAPostInput {
  @Field()
  from: UserId;
  @Field()
  to: PostId;
}

@InputType()
export class VoteACommentInput {
  @Field()
  from: UserId;
  @Field()
  to: CommentId;
}

@InputType()
export class UnvoteACommentInput extends VoteACommentInput {}
@InputType()
export class UnvoteAPostInput extends VoteAPostInput {}