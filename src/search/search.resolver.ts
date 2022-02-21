import { Args, Query, Resolver } from '@nestjs/graphql'

import { NoAuth } from '../auth/decorator'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { Search, SearchArgs, SearchResultItemConnection } from './model/search.model'
import { SearchService } from './search.service'

@Resolver((_of: Search) => Search)
export class SearchResolver {
  constructor (private readonly searchService: SearchService) {}

  @Query(of => SearchResultItemConnection, { description: '简单的搜索' })
  @NoAuth()
  async search (@Args() searchArgs: SearchArgs, @Args() paging: RelayPagingConfigArgs): Promise<SearchResultItemConnection> {
    return await this.searchService.search(searchArgs, paging)
  }
}
