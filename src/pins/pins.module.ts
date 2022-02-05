import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { PinsResolver } from './pins.resolver'
import { PinsService } from './pins.service'

@Module({
  providers: [PinsResolver, PinsService, DbService]
})
export class PinsModule {}
