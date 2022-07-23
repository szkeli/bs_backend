import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { AnonymousResolver } from './anonymous.resolver'
import { AnonymousService } from './anonymous.service'

@Module({
  providers: [AnonymousResolver, AnonymousService],
  imports: [SharedModule]
})
export class AnonymousModule {}
