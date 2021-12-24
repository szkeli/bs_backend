import { Field, ObjectType, Int, registerEnumType, InputType } from "@nestjs/graphql";
import { Post } from "src/posts/models/post.model";

export enum GENDER {
  NONE = 'NONE',
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

registerEnumType(GENDER, {
  name: 'GENDER'
})

@InputType()
export class UserCreateInput {
  @Field()
  id: string;
  @Field()
  openId: string;
  @Field()
  unionId: string;
  @Field()
  nickName: string;
  @Field(type => GENDER)
  gender: GENDER
  @Field(type => Int)
  flag: number;
  @Field()
  createAt: string;
  @Field()
  lastLoginAt: string;
  @Field()
  avatarUrl: string;
  @Field()
  school: string;
  @Field()
  grade: string;
}

@InputType()
export class UserUpdateInput {
  @Field()
  id: string;
  @Field()
  openId: string;
  @Field()
  unionId: string;
  @Field()
  nickName: string;
  @Field(type => GENDER)
  gender: GENDER;
  @Field()
  flag: string;
  @Field()
  createAt: string;
  @Field()
  lastLoginAt: string;
  @Field()
  avatarUrl: string;
  @Field()
  school: string;
  @Field()
  grade: string;
}

@InputType()
export class UserFollowOneInput {
  @Field()
  id: string;
}

@ObjectType()
export class User {
  @Field()
  id?: string;
  @Field()
  openId: string;
  @Field()
  unionId: string;
  @Field()
  nickName: string;
  @Field(type => GENDER, { defaultValue: GENDER.NONE})
  gender: GENDER;
  @Field(type => Int, {defaultValue: 0})
  flag?: number;
  @Field(type => Int)
  createAt: number;
  @Field(type => Int)
  lastLoginAt: number;
  @Field()
  avatarUrl: string;
  @Field()
  school: string;
  @Field()
  grade: string;
  @Field(type => [Post], {nullable: true})
  Post?: Post[];
}