import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { ReportsResolver } from './reports.resolver'
import { ReportsService } from './reports.service'

@Module({
  imports: [SharedModule],
  providers: [ReportsService, ReportsResolver]
})
export class ReportsModule {}
