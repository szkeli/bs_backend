import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { PinsResolver } from './pins.resolver'
import { PinsService } from './pins.service'

@Module({
  providers: [PinsResolver, PinsService],
  imports: [SharedModule]
})
export class PinsModule {}
