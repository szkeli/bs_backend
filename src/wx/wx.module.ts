import { Module } from '@nestjs/common'

import { CosService } from '../cos/cos.service'
import { WxResolver } from './wx.resolver'
import { WxService } from './wx.service'

@Module({
  providers: [WxResolver, WxService, CosService]
})
export class WxModule {}
