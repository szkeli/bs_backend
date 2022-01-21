import { Field, Float, Int, ObjectType } from '@nestjs/graphql'

export type UserId = string
export type PostId = string
export type Time = number

export class CreateUserDto {
  name: string
  createAt: Time
  lastLoginAt: Time
  avatarUrl: string
  unionId: string
  openId: string
  school: string
  grade: string
  gender: string
}

export class FollowAPersonDto {
  /**
   * 关注者
   */
  from: UserId
  /**
   * 被关注者
   */
  to: UserId
}

@ObjectType()
export class SetDbSchema {
  @Field(type => Int)
    arrayIndexOffset: number

  @Field(type => [String])
    array: string[]

  @Field(type => Float)
    pivot_: number

  @Field({ nullable: true })
    wrappers_?: string

  @Field({ nullable: true })
    messageId_?: string

  @Field()
    convertedPrimitiveFields_: string
}
