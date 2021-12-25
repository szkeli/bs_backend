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
}

@InputType()
export class AddACommentOnCommentInput {
  @Field()
  to: CommentId;
  @Field()
  creator: UserId;
  @Field()
  content: string;
}