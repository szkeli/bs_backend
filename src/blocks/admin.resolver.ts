import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { PagingConfigArgs } from '../user/models/user.model'
import { BlocksService } from './blocks.service'
import { BlocksConnection } from './models/blocks.model'

@Resolver(of => Admin)
export class AdminResolver {
  constructor (private readonly blocksService: BlocksService) {}

  @ResolveField(of => BlocksConnection, { description: '当前管理员拉黑的用户' })
  async blocks (@Parent() admin: Admin, @Args() { first, offset }: PagingConfigArgs) {
    return await this.blocksService.findBlocksByAdminId(admin.id, first, offset)
  }
}
