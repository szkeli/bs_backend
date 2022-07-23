import { CacheModule, Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { LessonsModule } from '../lessons/lessons.module'
import { SharedModule } from '../shared/shared.module'
import { TasksResolver } from './tasks.resolver'
import { TasksService } from './tasks.service'

@Module({
  imports: [
    CacheModule.register(),
    SharedModule,
    DbModule,
    LessonsModule
  ],
  providers: [
    TasksService,
    TasksResolver
  ]
})
export class TasksModule {}
