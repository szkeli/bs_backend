import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { PostsConnection, RelayPagingConfigArgs } from '../posts/models/post.model'
import { HashtagsService } from './hashtags.service'
import { Hashtag, HashtagsConnection } from './models/hashtags.model'

@Resolver(of => Hashtag)
export class HashtagsResolver {
  constructor (private readonly hashtagsService: HashtagsService) {}

  @Query(of => Hashtag)
  async hashtag (@Args('id') id: string) {
    return await this.hashtagsService.hashtag(id)
  }

  @Query(of => HashtagsConnection)
  async hashtags (@Args() args: RelayPagingConfigArgs) {
    return await this.hashtagsService.hashtags(args)
  }

  @ResolveField(of => PostsConnection, { description: '具有该 Hashtag 的所有 Post' })
  async posts (@Parent() hashtag: Hashtag, @Args() args: RelayPagingConfigArgs) {
    return await this.hashtagsService.posts(hashtag.id, args)
  }
}
