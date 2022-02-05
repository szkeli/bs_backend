import { Module } from '@nestjs/common'

import { CensorsResolver } from './censors.resolver'
import { CensorsService } from './censors.service'

@Module({
  providers: [CensorsResolver, CensorsService]
})
export class CensorsModule {}
