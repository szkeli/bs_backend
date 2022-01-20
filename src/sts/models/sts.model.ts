import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class PostImagesUploadCredentialInfo {
  @Field(type => Int)
    startTime: number

  @Field(type => Int)

    expiredTime: number

  @Field()
    expiration: string

  @Field()
    sessionToken: string

  @Field()
    tmpSecretId: string

  @Field()
    tmpSecretKey: string

  @Field()
    bucket: string

  @Field()
    region: string

  @Field(type => [String])
    keys: string[]
}

@ObjectType()
export class AvatarImageUploadCredentialInfo {
  @Field(type => Int)
    startTime: number

  @Field(type => Int)

    expiredTime: number

  @Field()
    expiration: string

  @Field()
    sessionToken: string

  @Field()
    tmpSecretId: string

  @Field()
    tmpSecretKey: string

  @Field()
    bucket: string

  @Field()
    region: string

  @Field()
    key: string
}

export interface STSDto {
  startTime: number
  expiredTime: number
  expiration: string
  requestId: string
  credentials: {
    sessionToken: string
    tmpSecretId: string
    tmpSecretKey: string
  }
}
