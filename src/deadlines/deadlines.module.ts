import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { DeadlinesResolver } from './deadlines.resolver'
import { DeadlinesService } from './deadlines.service'

@Module({
  providers: [DeadlinesResolver, DeadlinesService, DbService]
})
export class DeadlinesModule {}
