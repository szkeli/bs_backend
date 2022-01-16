import { Module } from '@nestjs/common'

import { ReportsResolver } from './reports.resolver'
import { ReportsService } from './reports.service'

@Module({
  providers: [ReportsService, ReportsResolver]
})
export class ReportsModule {}
