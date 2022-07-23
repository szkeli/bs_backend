import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { FoldsModule } from '../folds/folds.module'
import { PinsModule } from '../pins/pins.module'
import { SharedModule } from '../shared/shared.module'
import { AdminResolver } from './admin.resolver'
import { AdminService } from './admin.service'
import { DeleteResolver } from './delete.resolver'

@Module({
  providers: [
    AdminResolver,
    AdminService,
    DeleteResolver
  ],
  exports: [AdminService],
  imports: [SharedModule, DbModule, FoldsModule, PinsModule]
})
export class AdminModule {}
