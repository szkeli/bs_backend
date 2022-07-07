import { ArgsType, Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

export enum FILEUPLOAD_GRANT_TYPE {
  POST_IMAGES = 'POST_IMAGES',
  COMMENT_IMAGES = 'COMMENT_IMAGES',
  SUBJECT_IMAGES = 'SUBJECT_IMAGES',
  AUTHENUSERINFO_IMAEGS = 'AUTHENUSERINFO_IMAEGS',
  AVATAR_IMAGES = 'AVATAR_IMAGES'
}

registerEnumType(FILEUPLOAD_GRANT_TYPE, {
  name: 'FILEUPLOAD_GRANT_TYPE',
  valuesMap: {
    POST_IMAGES: {
      description: '请求将图片上传到帖子相关文件夹下的凭证'
    },
    COMMENT_IMAGES: {
      description: '请求将图片上传到评论相关文件夹下的凭证'
    },
    SUBJECT_IMAGES: {
      description: '请求将图片上传到主题相关文件夹下的凭证'
    },
    AUTHENUSERINFO_IMAEGS: {
      description: '请求将图片上传到认证信息相关文件夹下的凭证'
    },
    AVATAR_IMAGES: {
      description: '请求将图片上传到头像相关文件夹下的凭证'
    }
  }
})

@ObjectType()
export class ImagesUploadCredentialInfo {
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

@ArgsType()
export class FileNamesArgs {
  @Field(of => [String])
    fileNames: string[]
}

@ArgsType()
export class UploaderFilter {
  @Field(of => FILEUPLOAD_GRANT_TYPE, { description: '获取的凭证类型' })
    grantType: FILEUPLOAD_GRANT_TYPE
}
