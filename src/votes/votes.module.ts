import { forwardRef, Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { PubsubsModule } from '../pubsubs/pubsubs.module'
import { SharedModule } from '../shared/shared.module'
import { VotesResolver } from './votes.resolver'
import { VotesService } from './votes.service'

@Module({
  imports: [
    PubsubsModule,
    forwardRef(() => SharedModule),
    DbModule
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
