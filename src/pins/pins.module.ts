import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { PinsResolver } from './pins.resolver'
import { PinsService } from './pins.service'

@Module({
  providers: [PinsResolver, PinsService],
  imports: [SharedModule, DbModule],
  exports: [PinsService]
})
export class PinsModule {}
