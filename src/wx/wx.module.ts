import { Module } from '@nestjs/common'

import { CosService } from '../cos/cos.service'
import { LessonsService } from '../lessons/lessons.service'
import { SharedModule } from '../shared/shared.module'
import { WxResolver } from './wx.resolver'
import { WxService } from './wx.service'

@Module({
  imports: [SharedModule],
  providers: [WxResolver, WxService, CosService, LessonsService]
})
export class WxModule {}
