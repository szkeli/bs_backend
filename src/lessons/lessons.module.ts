import { forwardRef, Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { WxModule } from '../wx/wx.module'
import { LessonsResolver } from './lessons.resolver'
import { LessonsService } from './lessons.service'

@Module({
  providers: [LessonsResolver, LessonsService],
  imports: [forwardRef(() => SharedModule), WxModule, DbModule],
  exports: [LessonsService]
})
export class LessonsModule {}
