import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { BlocksResolver } from './blocks.resolver'
import { BlocksService } from './blocks.service'

@Module({
  providers: [BlocksResolver, BlocksService],
  imports: [SharedModule]
})
export class BlocksModule {}
