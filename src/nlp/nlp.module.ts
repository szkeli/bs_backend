import { Module } from '@nestjs/common'

import { NlpResolver } from './nlp.resolver'
import { NlpService } from './nlp.service'

@Module({
  providers: [NlpResolver, NlpService]
})
export class NlpModule {}
