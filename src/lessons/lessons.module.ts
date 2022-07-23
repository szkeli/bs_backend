import { forwardRef, Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { WxModule } from '../wx/wx.module'
import { DeadlineResolver } from './deadline.resolver'
import { LessonsResolver } from './lessons.resolver'
import { LessonsService } from './lessons.service'
import { UserResolver } from './user.resolver'

@Module({
  providers: [LessonsResolver, LessonsService, UserResolver, DeadlineResolver],
  imports: [forwardRef(() => SharedModule), WxModule, DbModule],
  exports: [LessonsService]
})
export class LessonsModule {}
