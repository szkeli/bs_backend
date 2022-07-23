import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { SearchResolver } from './search.resolver'
import { SearchService } from './search.service'

@Module({
  providers: [SearchResolver, SearchService],
  imports: [SharedModule]
})
export class SearchModule {}
