import { Module } from '@nestjs/common';
import { VotesService } from './votes.service';
import { VotesResolver } from './votes.resolver';
import { DbService } from 'src/db/db.service';

@Module({
  providers: [VotesService, VotesResolver, DbService]
})
export class VotesModule {}
