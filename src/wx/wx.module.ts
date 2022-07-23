import { forwardRef, Module } from '@nestjs/common'

import { CosModule } from '../cos/cos.module'
import { SharedModule } from '../shared/shared.module'
import { WxResolver } from './wx.resolver'
import { WxService } from './wx.service'

@Module({
  imports: [forwardRef(() => SharedModule), CosModule],
  providers: [WxResolver, WxService],
  exports: [WxService]
})
export class WxModule {}
