import { Module } from '@nestjs/common'

import { DbService } from 'src/db/db.service'

import { SearchResolver } from './search.resolver'
import { SearchService } from './search.service'

@Module({
  providers: [SearchResolver, SearchService, DbService]
})
export class SearchModule {}
