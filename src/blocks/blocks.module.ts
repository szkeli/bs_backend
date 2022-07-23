import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { BlocksResolver } from './blocks.resolver'
import { BlocksService } from './blocks.service'

@Module({
  providers: [BlocksResolver, BlocksService],
  imports: [SharedModule, DbModule],
  exports: [BlocksService]
})
export class BlocksModule {}
