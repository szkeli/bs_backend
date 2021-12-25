import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Post {
  @Field()
  id?: string;
  @Field()
  title: string;
  @Field()
  content: string;
  @Field(type => Int)
  votes: number;
  @Field()
  createAt: string;
}