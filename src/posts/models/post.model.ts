import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { UserId } from 'src/db/db.service';

@ObjectType()
export class Post {
  @Field()
  id?: string;
  @Field()
  title: string;
  @Field()
  content: string;
  @Field()
  createAt: string;
}

@InputType()
export class CreateAPostInput {
  @Field()
  title: string;
  @Field()
  content: string;
  @Field()
  creator: UserId;
}