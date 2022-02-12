import { Args, Query, Resolver } from '@nestjs/graphql'

import { NoAuth } from '../auth/decorator'
import { PagingConfigArgs } from '../user/models/user.model'
import { Search, SearchArgs, SearchResultItemConnection, SEARCHTYPE } from './model/search.model'
import { SearchService } from './search.service'

@Resolver((_of: Search) => Search)
export class SearchResolver {
  constructor (private readonly searchService: SearchService) {}

  @Query(of => SearchResultItemConnection, { description: '简单的搜索' })
  @NoAuth()
  async search (@Args() { query, type }: SearchArgs, @Args() args: PagingConfigArgs): Promise<SearchResultItemConnection> {
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
