import { Field, InputType, ObjectType } from "@nestjs/graphql";
import { UserId } from "src/db/model/db.model";

export type SubjectId = string;

@InputType()
export class SubjectBase {
  @Field()
  title: string;
  @Field()
  subscription: string;
  @Field()
  avatarUrl: string;
  @Field()
  background: string;
}

@ObjectType()
export class Subject {
  @Field()
  id: SubjectId;
  @Field()
  creator: UserId;
  @Field()
  createAt: string;
  @Field()
  title: string;
  @Field()
  subscription: string;
  @Field()
  avatarUrl: string;
  @Field()
  background: string;
}

@InputType()
export class CreateSubjectInput extends SubjectBase {}

@InputType()
export class UpdateSubjectInput {
  @Field()
  id: SubjectId;
  @Field({ nullable: true })
  title?: string;
  @Field({ nullable: true })
  subscription?: string;
  @Field({ nullable: true })
  avatarUrl?: string;
  @Field({ nullable: true })
  background?: string;
}
