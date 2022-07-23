import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { FoldsResolver } from './folds.resolver'
import { FoldsService } from './folds.service'

@Module({
  providers: [FoldsResolver, FoldsService],
  imports: [SharedModule, DbModule],
  exports: [FoldsService]
})
export class FoldsModule {}
