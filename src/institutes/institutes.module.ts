import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { InstitutesResolver } from './institutes.resolver'
import { InstitutesService } from './institutes.service'

@Module({
  providers: [InstitutesResolver, InstitutesService],
  imports: [SharedModule]
})
export class InstitutesModule {}
