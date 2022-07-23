import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { PinsConnection } from './models/pins.model'
import { PinsService } from './pins.service'

@Resolver(of => Admin)
export class AdminResolver {
  constructor (private readonly pinsService: PinsService) {}

  @ResolveField(of => PinsConnection, { description: '当前管理员创建的置顶' })
  async pins (@Parent() admin: Admin, @Args() paging: RelayPagingConfigArgs) {
    return await this.pinsService.findPinsByAdminId(admin.id, paging)
  }
}
