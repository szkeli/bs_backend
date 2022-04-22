import { Args, Query, Resolver } from '@nestjs/graphql'

import { Role, Roles } from '../auth/decorator'
import { GetUnlimitedWXacodeArgs, GetWXMiniProgrameShortLinkArgs, SendSubscribeMessageArgs, SendUniformMessageArgs } from './models/wx.model'
import { WxService } from './wx.service'

@Resolver()
export class WxResolver {
  constructor (private readonly wxService: WxService) {}

  @Query(of => String)
  async getUnlimitedWXacode (@Args() config: GetUnlimitedWXacodeArgs) {
    return await this.wxService.getUnlimitedWXacode(config)
  }

  @Query(of => String)
  async getWXMiniProgrameShortLink (@Args() config: GetWXMiniProgrameShortLinkArgs) {
    return await this.wxService.getWXMiniProgrameShortLink(config)
  }

  @Query(of => String)
  @Roles(Role.Admin)
  async sendUniformMessage (@Args() config: SendUniformMessageArgs) {
    return (await this.wxService.sendUniformMessage(config)).errmsg
  }

  @Query(of => String, { description: '向小程序下发订阅消息' })
  @Roles(Role.Admin)
  async sendSubscibeMessage (@Args() config: SendSubscribeMessageArgs) {
    return (await this.wxService.sendSubscribeMessage(config)).errmsg
  }
}
