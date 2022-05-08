import { CacheModule, Module } from '@nestjs/common'

import { CosService } from '../cos/cos.service'
import { DbService } from '../db/db.service'
import { LessonsService } from '../lessons/lessons.service'
import { WxService } from '../wx/wx.service'
import { TasksService } from './tasks.service'

@Module({
  imports: [
    CacheModule.register()
  ],
  providers: [
    WxService,
    CosService,
    TasksService,
    DbService,
    LessonsService
  ]
})
export class TasksModule {}
