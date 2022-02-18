import { Args, Query, Resolver } from '@nestjs/graphql'

import { GetUnlimitedWXacodeArgs } from './models/wx.model'
import { WxService } from './wx.service'

@Resolver()
export class WxResolver {
  constructor (private readonly wxService: WxService) {}

  @Query(of => String)
  async getUnlimitedWXacode (@Args() config: GetUnlimitedWXacodeArgs) {
    return await this.wxService.getUnlimitedWXacode(config)
  }
}
