import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import * as sts from 'qcloud-cos-sts'

import {
  FileNameCannotBeNullException,
  SystemErrorException
} from '../app.exception'
import {
  FileNamesArgs,
  FILEUPLOAD_GRANT_TYPE,
  ImagesUploadCredentialInfo,
  STSDto,
  UploaderFilter
} from './models/sts.model'

@Injectable()
export class StsService {
  private readonly bucket = 'dev-1306842204'
  private readonly region = 'ap-guangzhou'

  async getImagesUploadCredentialInfo (
    id: string,
    { fileNames }: FileNamesArgs,
    { grantType }: UploaderFilter
  ) {
    if (!fileNames || fileNames.length === 0) {
      throw new FileNameCannotBeNullException()
    }

    const t = [
      [FILEUPLOAD_GRANT_TYPE.POST_IMAGES, 'postImages'],
      [FILEUPLOAD_GRANT_TYPE.COMMENT_IMAGES, 'commentImages'],
      [FILEUPLOAD_GRANT_TYPE.SUBJECT_IMAGES, 'subjectImages'],
      [FILEUPLOAD_GRANT_TYPE.AUTHENUSERINFO_IMAEGS, 'authenUserImages'],
      [FILEUPLOAD_GRANT_TYPE.AVATAR_IMAGES, 'avatarImages']
    ]
    const k = t.find(i => i[0] === grantType)
    if (!k || k.length !== 2) {
      throw new SystemErrorException('k should not be undefined')
    }

    const u = randomUUID()
    const keys: string[] = []
    const resource = fileNames.map(f => {
      const url = `${k[1]}/${id}/${u}/${f}`
      keys.push(url)
      return `qcs::cos:${this.region}:uid/1306842204:${this.bucket}/${url}`
    })

    return await this._get(resource, keys)
  }

  async _get (
    resource: string[],
    keys: string[]
  ): Promise<ImagesUploadCredentialInfo> {
    const secretId = process.env.COS_SECRET_ID
    const secretKey = process.env.COS_SECRET_KEY
    if (!secretId) {
      throw new SystemErrorException('必须提供 process.env.COS_SECRET_ID')
    }
    if (!secretKey) {
      throw new SystemErrorException('必须提供 process.env.COS_SECRET_KEY')
    }

    const res = (await sts.getCredential({
      secretId,
      secretKey,
      proxy: '',
      durationSeconds: 60 * 30,
      policy: {
        version: '2.0',
        statement: [
          {
            action: [
              // 简单上传
              'name/cos:PutObject',
              // 表单上传
              'name/cos:PostObject',
              // 分块上传：初始化分块操作
              'name/cos:InitiateMultipartUpload',
              // 分块上传：List 进行中的分块上传
              'name/cos:ListMultipartUploads',
              // 分块上传：List 已上传的分块
              'name/cos:ListParts',
              // 分块上传：完成所有分块上传操作
              'name/cos:CompleteMultipartUpload',
              // 取消分块上传操作
              'name/cos:AbortMultipartUpload'
            ],
            effect: 'allow',
            resource
          }
        ]
      }
    })) as unknown as STSDto
    return {
      region: this.region,
      bucket: this.bucket,
      keys,
      sessionToken: res.credentials.sessionToken,
      tmpSecretId: res.credentials.tmpSecretId,
      tmpSecretKey: res.credentials.tmpSecretKey,
      expiration: res.expiration,
      expiredTime: res.expiredTime,
      startTime: res.startTime
    }
  }
}
