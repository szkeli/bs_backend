import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { BlocksResolver } from './blocks.resolver'
import { BlocksService } from './blocks.service'

@Module({
  providers: [BlocksResolver, BlocksService, DbService]
})
export class BlocksModule {}
