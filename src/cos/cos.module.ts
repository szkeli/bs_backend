import { Module } from '@nestjs/common'

import { CosResolver } from './cos.resolver'
import { CosService } from './cos.service'

@Module({
  providers: [CosResolver, CosService]
})
export class CosModule {}
