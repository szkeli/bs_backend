import { Args, Query, Resolver } from '@nestjs/graphql'

import { PagingConfigArgs } from '../user/models/user.model'
import { Search, SearchResultItemConnection, SEARCHTYPE } from './model/search.model'
import { SearchService } from './search.service'

@Resolver((_of: Search) => Search)
export class SearchResolver {
  constructor (private readonly searchService: SearchService) {}

  @Query(returns => SearchResultItemConnection)
  async search (
    @Args('type', { type: () => SEARCHTYPE, nullable: false }) type: SEARCHTYPE,
      @Args('query', { type: () => String, nullable: false, description: '待检索的关键字' }) query: string,
      @Args() args: PagingConfigArgs
  ): Promise<SearchResultItemConnection> {
    if (type === SEARCHTYPE.POST) {
      return await this.searchService.searchPost(query, args.first, args.offset)
    }
    if (type === SEARCHTYPE.USER) {
      return await this.searchService.searchUser(query, args.first, args.offset)
    }
    if (type === SEARCHTYPE.COMMENT) {
      return await this.searchService.searchComment(query, args.first, args.offset)
    }
    if (type === SEARCHTYPE.SUBJECT) {
      return await this.searchService.searchSubject(query, args.first, args.offset)
    }
  }
}
