import { Module } from '@nestjs/common'

import { CosService } from '../cos/cos.service'
import { DbService } from '../db/db.service'
import { LessonsService } from '../lessons/lessons.service'
import { WxResolver } from './wx.resolver'
import { WxService } from './wx.service'

@Module({
  providers: [WxResolver, WxService, CosService, DbService, LessonsService]
})
export class WxModule {}
