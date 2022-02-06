import { Module } from '@nestjs/common'

import { DbService } from 'src/db/db.service'

import { PubsubsModule } from '../pubsubs/pubsubs.module'
import { VotesResolver } from './votes.resolver'
import { VotesService } from './votes.service'

@Module({
  imports: [
    PubsubsModule
  ],
  providers: [
    VotesService,
    VotesResolver,
    DbService
  ]
})
export class VotesModule {}
