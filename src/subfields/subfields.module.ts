import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { SubfieldsResolver } from './subfields.resolver'
import { SubfieldsService } from './subfields.service'

@Module({
  providers: [SubfieldsResolver, SubfieldsService, DbService]
})
export class SubfieldsModule {}
