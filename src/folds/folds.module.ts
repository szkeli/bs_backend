import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { FoldsResolver } from './folds.resolver'
import { FoldsService } from './folds.service'

@Module({
  providers: [FoldsResolver, FoldsService, DbService]
})
export class FoldsModule {}
