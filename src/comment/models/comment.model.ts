import { Field, InputType, Int, ObjectType } from "@nestjs/graphql";
import { Time, UserId } from "src/db/db.service";

export type CommentId = string;

@ObjectType()
export class Comment {
  @Field()
  id: CommentId;
  @Field()
  content: string;
  @Field()
  createAt: string;
  @Field(type => Int)
  voteCount: number;
  @Field(type => Int)
  commentCount: number;
}

@InputType()
export class AddACommentOnCommentInput {
  @Field()
  creator: UserId;
  @Field()
  to: CommentId;
  @Field()
  content: string;
}

@InputType()
export class AddACommentOnPostInput extends AddACommentOnCommentInput {}