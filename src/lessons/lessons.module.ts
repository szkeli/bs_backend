import { Module } from '@nestjs/common'

import { CosService } from '../cos/cos.service'
import { SharedModule } from '../shared/shared.module'
import { WxService } from '../wx/wx.service'
import { LessonsResolver } from './lessons.resolver'
import { LessonsService } from './lessons.service'

@Module({
  providers: [LessonsResolver, LessonsService, WxService, CosService],
  imports: [SharedModule]
})
export class LessonsModule {}
