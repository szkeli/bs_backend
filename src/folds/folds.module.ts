import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { FoldsResolver } from './folds.resolver'
import { FoldsService } from './folds.service'

@Module({
  providers: [FoldsResolver, FoldsService],
  imports: [SharedModule]
})
export class FoldsModule {}
