import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class PostImagesUploadCredentialInfo {
  @Field(type => Int, { description: '签证生效时间' })
    startTime: number

  @Field(type => Int, { description: '签证过期时间' })

    expiredTime: number

  @Field()
    expiration: string

  @Field()
    sessionToken: string

  @Field()
    tmpSecretId: string

  @Field()
    tmpSecretKey: string

  @Field({ description: '桶id' })
    bucket: string

  @Field({ description: '桶所在的地域' })
    region: string

  @Field(type => [String], { description: 'key' })
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
