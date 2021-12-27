import { Field, ObjectType, Int, registerEnumType, InputType } from "@nestjs/graphql";

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
export class UserUpdateInput {
  @Field()
  id: string;
  @Field({ nullable: true })
  openId?: string;
  @Field({ nullable: true })
  unionId?: string;
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
