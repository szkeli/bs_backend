import { ForbiddenException, Injectable } from '@nestjs/common'
import * as sts from 'qcloud-cos-sts'

import { uuid } from 'src/tool'

import { AvatarImageUploadCredentialInfo, PostImagesUploadCredentialInfo, STSDto } from './models/sts.model'

@Injectable()
export class StsService {
  private readonly bucket = 'dev-1306842204'
  private readonly region = 'ap-guangzhou'
  async getPostImagesUploadCredentialInfo (id: string, fileNames: string[]): Promise<PostImagesUploadCredentialInfo> {
    if (!fileNames || fileNames.length === 0) {
      throw new ForbiddenException('图片文件名不能为空')
    }
    const u = uuid()
    const keys: string[] = []
    const resource = fileNames.map(f => {
      const url = `postImages/${id}/${u}/${f}`
      keys.push(url)
      return `qcs::cos:${this.region}:uid/1306842204:${this.bucket}/${url}`
    })
    const res = await sts.getCredential({
      secretId: process.env.COS_SECRET_ID,
      secretKey: process.env.COS_SECRET_KEY,
      proxy: '',
      durationSeconds: 60 * 30,
      policy: {
        version: '2.0',
        statement: [{
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
        }]
      }
    }) as unknown as STSDto
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

  /**
   * 根据当前用户和头像文件名返回上传头像所需的信息
   * @param id 用户唯一id
   * @param fileName 头像文件名
   * @returns {Promise<STS>}
   */
  async getAvatarImageUploadCredentialInfo (id: string, fileName: string): Promise<AvatarImageUploadCredentialInfo> {
    const userAvatarImageUrl = `avatarImages/${id}/${fileName}`

    if (!fileName || fileName.length === 0) {
      throw new ForbiddenException('文件名 fileName 不能为空')
    }

    const res = await sts.getCredential({
      secretId: process.env.COS_SECRET_ID,
      secretKey: process.env.COS_SECRET_KEY,
      proxy: '',
      durationSeconds: 60 * 30,
      policy: {
        version: '2.0',
        statement: [{
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
          resource: [
            `qcs::cos:${this.region}:uid/1306842204:${this.bucket}/${userAvatarImageUrl}`
          ]
        }]
      }
    }) as unknown as STSDto

    return {
      region: this.region,
      bucket: this.bucket,
      key: userAvatarImageUrl,
      sessionToken: res.credentials.sessionToken,
      tmpSecretKey: res.credentials.tmpSecretKey,
      tmpSecretId: res.credentials.tmpSecretId,
      expiration: res.expiration,
      expiredTime: res.expiredTime,
      startTime: res.startTime
    }
  }
}
