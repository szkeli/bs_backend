import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { DeadlinesResolver } from './deadlines.resolver'
import { DeadlinesService } from './deadlines.service'

@Module({
  providers: [DeadlinesResolver, DeadlinesService],
  imports: [SharedModule]
})
export class DeadlinesModule {}
