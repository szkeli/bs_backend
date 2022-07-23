import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { SubfieldsResolver } from './subfields.resolver'
import { SubfieldsService } from './subfields.service'

@Module({
  imports: [SharedModule],
  providers: [SubfieldsResolver, SubfieldsService]
})
export class SubfieldsModule {}
