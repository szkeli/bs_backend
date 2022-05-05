import { Module } from '@nestjs/common'

import { CosService } from '../cos/cos.service'
import { DbService } from '../db/db.service'
import { WxService } from '../wx/wx.service'
import { LessonsResolver } from './lessons.resolver'
import { LessonsService } from './lessons.service'

@Module({
  providers: [LessonsResolver, LessonsService, DbService, WxService, CosService]
})
export class LessonsModule {}
