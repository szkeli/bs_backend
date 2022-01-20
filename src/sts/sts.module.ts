import { Module } from '@nestjs/common'

import { StsResolver } from './sts.resolver'
import { StsService } from './sts.service'

@Module({
  providers: [StsResolver, StsService]
})
export class StsModule {}
