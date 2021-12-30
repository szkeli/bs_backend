import { Module } from '@nestjs/common'

import { DbService } from 'src/db/db.service'

import { VotesResolver } from './votes.resolver'
import { VotesService } from './votes.service'

@Module({
  providers: [VotesService, VotesResolver, DbService]
})
export class VotesModule {}
