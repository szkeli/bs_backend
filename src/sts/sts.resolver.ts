import { Args, Query, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { User } from '../user/models/user.model'
import { FileNamesArgs, ImagesUploadCredentialInfo, UploaderFilter } from './models/sts.model'
import { StsService } from './sts.service'

@Resolver()
export class StsResolver {
  constructor (private readonly stsService: StsService) {}

  @Query(of => ImagesUploadCredentialInfo, { description: '上传图片到 COS 前，必须通过相应的接口获取上传凭证' })
  async getImagesUploadCredentialInfo (@CurrentUser() user: User, @Args() args: FileNamesArgs, @Args() filter: UploaderFilter) {
    return await this.stsService.getImagesUploadCredentialInfo(user.id, args, filter)
  }
}
