import { Module } from '@nestjs/common'

import { PubsubsModule } from '../pubsubs/pubsubs.module'
import { SharedModule } from '../shared/shared.module'
import { VotesResolver } from './votes.resolver'
import { VotesService } from './votes.service'

@Module({
  imports: [
    PubsubsModule,
    SharedModule
  ],
  providers: [
    VotesService,
    VotesResolver
  ],
  exports: [
    VotesService
  ]
})
export class VotesModule {}
