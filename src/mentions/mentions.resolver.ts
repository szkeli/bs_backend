import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { User } from '../user/models/user.model'
import { MentionsService } from './mentions.service'
import { Mention, MentionsConnection } from './models/mentions.model'

@Resolver(of => Mention)
export class MentionsResolver {
  constructor (private readonly mentionsService: MentionsService) {}

  @Query(of => Mention)
  async mention (@Args('id') id: string) {
    return await this.mentionsService.mention(id)
  }

  @Query(of => MentionsConnection)
  async mentions (@Args() args: RelayPagingConfigArgs) {
    return await this.mentionsService.mentions(args)
  }

  @ResolveField(of => User, { description: '创建者' })
  async creator (@Parent() mention: Mention) {
    return await this.mentionsService.creator(mention.id)
  }

  @ResolveField(of => User, { description: '被@的对象' })
  async to (@Parent() mention: Mention) {
    return await this.mentionsService.to(mention.id)
  }

  @ResolveField(of => PostAndCommentUnion, { description: '被@的主体' })
  async about (@Parent() mention: Mention) {
    return await this.mentionsService.about(mention.id)
  }
}
