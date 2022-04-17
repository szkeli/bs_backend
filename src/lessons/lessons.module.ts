import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { LessonsResolver } from './lessons.resolver'
import { LessonsService } from './lessons.service'

@Module({
  providers: [LessonsResolver, LessonsService, DbService]
})
export class LessonsModule {}
