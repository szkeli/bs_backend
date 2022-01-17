import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { ReportsResolver } from './reports.resolver'
import { ReportsService } from './reports.service'

@Module({
  providers: [ReportsService, ReportsResolver, DbService]
})
export class ReportsModule {}
