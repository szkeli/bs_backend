import { forwardRef, Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { ReportsResolver } from './reports.resolver'
import { ReportsService } from './reports.service'
import { UserResolver } from './user.resolver'

@Module({
  imports: [forwardRef(() => SharedModule), ReportsModule, DbModule],
  providers: [ReportsService, ReportsResolver, UserResolver],
  exports: [ReportsService]
})
export class ReportsModule {}
