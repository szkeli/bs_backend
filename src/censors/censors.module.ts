import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { CensorsResolver } from './censors.resolver'
import { CensorsService } from './censors.service'

@Module({
  imports: [DbModule],
  providers: [CensorsResolver, CensorsService],
  exports: [CensorsService]
})
export class CensorsModule {}
