import { Module } from '@nestjs/common'

import { BlocksModule } from '../blocks/blocks.module'
import { DbModule } from '../db/db.module'
import { FoldsModule } from '../folds/folds.module'
import { PinsModule } from '../pins/pins.module'
import { SharedModule } from '../shared/shared.module'
import { AdminResolver } from './admin.resolver'
import { AdminService } from './admin.service'

@Module({
  providers: [
    AdminResolver,
    AdminService
  ],
  exports: [AdminService],
  imports: [SharedModule, DbModule, FoldsModule, BlocksModule, PinsModule]
})
export class AdminModule {}
