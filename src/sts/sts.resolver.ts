import { Args, Query, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { User } from '../user/models/user.model'
import { AvatarImageUploadCredentialInfo, PostImagesUploadCredentialInfo } from './models/sts.model'
import { StsService } from './sts.service'

@Resolver()
export class StsResolver {
  constructor (private readonly stsService: StsService) {}

  @Query(() => AvatarImageUploadCredentialInfo, { description: '用户上传头像时，先根据文件名获取临时上传凭证信息' })
  async getAvatarImageUploadCredentialInfo (
  @CurrentUser() user: User,
    @Args('fileName') fileName: string
  ) {
    return await this.stsService.getAvatarImageUploadCredentialInfo(user.id, fileName)
  }

  @Query(() => PostImagesUploadCredentialInfo, { description: '用户上传帖子图片时，先根据文件名获取临时上传凭证信息' })
  async getPostImagesUploadCredentialInfo (
  @CurrentUser() user: User,
    @Args('fileNames', { type: () => [String] }) fileNames: [string]
  ) {
    return await this.stsService.getPostImagesUploadCredentialInfo(user.id, fileNames)
  }
}
