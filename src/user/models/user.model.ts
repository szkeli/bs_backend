import { Field, ObjectType, Int, registerEnumType, InputType, } from "@nestjs/graphql";
import { SysId, UserId } from "src/db/model/db.model";

export enum ORDERBY {
  // 时间戳从大到小
  DESC = 'DESC',
  // 随机排列
  SHUFFLE = 'SHUFFLE',
  // 时间戳从小到大
  ASC = 'ASC'
}

registerEnumType(ORDERBY, {
  name: 'ORDERBY'
})

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
  openId: string;
  @Field()
  unionId: string;
  @Field()
  nickName: string;
  @Field(type => GENDER)
  gender: GENDER
  @Field()
  avatarUrl: string;
  @Field()
  school: string;
  @Field()
  grade: string;
}

@InputType()
export class UserRegisterInput extends UserCreateInput {
  @Field()
  userId: UserId;
  @Field()
  sign: RawSign;
}

export type RawSign = string;

@InputType()
export class UserUpdateProfileInput {
  @Field({ nullable: true })
  nickName?: string;
  @Field(type => GENDER, { nullable: true })
  gender?: GENDER;
  @Field({ nullable: true })
  avatarUrl?: string;
  @Field({ nullable: true })
  school?: string;
  @Field({ nullable: true })
  grade?: string;
  @Field({ nullable: true })
  sign?: string;
}

@InputType()
export class UserFollowOneInput {
  @Field()
  to: UserId;
}

@InputType()
export class UserUnFollowOneInput {
  @Field()
  to: UserId;
}

@ObjectType()
export class User {
  @Field()
  id?: UserId;
  @Field()
  userId: UserId;
  @Field()
  sign: string;
  @Field()
  openId: string;
  @Field()
  unionId: string;
  @Field()
  nickName: string;
  @Field(type => GENDER, { defaultValue: GENDER.NONE})
  gender: GENDER;
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
export class UserPostsInput {
  @Field(type => Int, { nullable: true, defaultValue: 0 })
  skip: number;
  @Field(type => Int, { nullable: true, defaultValue: 10 })
  limit: number;
  @Field(type => ORDERBY, { defaultValue: ORDERBY.DESC })
  orderBy: ORDERBY;
}

@InputType()
export class UserFansInput extends UserPostsInput {}

@InputType()
export class UserMyFollowedsInput extends UserPostsInput {}

export class CreateFollowRelationInput {
  from: UserId;
  to: UserId;
}
export class DeleteFollowRelationInput {
  from: UserId;
  to: UserId;
}

@ObjectType()
export class LoginResult extends User {
  @Field()
  token: string;
}

@InputType()
export class UserLoginInput {
  @Field()
  userId: UserId;
  @Field()
  sign: string;
}