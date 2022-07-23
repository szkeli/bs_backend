import { CacheModule, Module } from '@nestjs/common'

import { CosService } from '../cos/cos.service'
import { LessonsService } from '../lessons/lessons.service'
import { SharedModule } from '../shared/shared.module'
import { WxService } from '../wx/wx.service'
import { TasksResolver } from './tasks.resolver'
import { TasksService } from './tasks.service'

@Module({
  imports: [
    CacheModule.register(),
    SharedModule
  ],
  providers: [
    WxService,
    CosService,
    TasksService,
    LessonsService,
    TasksResolver
  ]
})
export class TasksModule {}
