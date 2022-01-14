import { Args, Int, Query, Resolver } from '@nestjs/graphql'

import { Search, SearchResultItemConnection, SEARCHTYPE } from './model/search.model'
import { SearchService } from './search.service'

@Resolver((_of: Search) => Search)
export class SearchResolver {
  constructor (private readonly searchService: SearchService) {}

  @Query(returns => SearchResultItemConnection)
  async search (
    @Args('type', { type: () => SEARCHTYPE, nullable: false }) type: SEARCHTYPE,
      @Args('query', { type: () => String, nullable: false, description: '待检索的关键字' }) query: string,
      @Args('first', { type: () => Int, nullable: true, defaultValue: 0 }) first?: number,
      @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset?: number
  ): Promise<SearchResultItemConnection> {
    if (type === SEARCHTYPE.POST) {
      return await this.searchService.searchPost(query, first, offset)
    }
    if (type === SEARCHTYPE.USER) {
      return await this.searchService.searchUser(query, first, offset)
    }
    if (type === SEARCHTYPE.COMMENT) {
      return await this.searchService.searchComment(query, first, offset)
    }
  }
}
