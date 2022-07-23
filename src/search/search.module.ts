import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { SearchResolver } from './search.resolver'
import { SearchService } from './search.service'

@Module({
  providers: [SearchResolver, SearchService],
  imports: [SharedModule, DbModule]
})
export class SearchModule {}
