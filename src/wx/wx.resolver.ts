import { Args, Query, Resolver } from '@nestjs/graphql'

import { CurrentUser, Role, Roles } from '../auth/decorator'
import { User } from '../user/models/user.model'
import {
  GetUnlimitedWXacodeArgs, GetWXMiniProgrameShortLinkArgs,
  GetWXSubscriptionInfoArgs, SendSubscribeMessageArgs,
  SendUniformMessageArgs,
  WxSubscriptionInfo
} from './models/wx.model'
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
  @Roles(Role.Admin, Role.User)
  async sendUniformMessage (@Args() config: SendUniformMessageArgs) {
    return (await this.wxService.sendUniformMessage(config)).errmsg
  }

  @Query(of => String, { description: '向小程序下发订阅消息' })
  @Roles(Role.Admin)
  async sendSubscibeMessage (@Args() config: SendSubscribeMessageArgs) {
    return (await this.wxService.sendSubscribeMessage(config)).errmsg
  }

  @Query(of => WxSubscriptionInfo, { description: '通过 token 获取指定用户的微信公众号关注信息 https://developers.weixin.qq.com/doc/offiaccount/User_Management/Get_users_basic_information_UnionID.html#UinonId' })
  @Roles(Role.User)
  async getWXSubscriptionInfo (@CurrentUser() user: User, @Args() args: GetWXSubscriptionInfoArgs) {
    return await this.wxService.getWXSubscriptionInfo(user.id, args)
  }
}
