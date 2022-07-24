import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { AnonymousService } from './anonymous.service'
import { Anonymous } from './models/anonymous.model'

@Resolver(of => Anonymous)
export class AnonymousResolver {
  constructor (private readonly anonymousService: AnonymousService) {}

  @ResolveField(of => PostAndCommentUnion, { description: '被匿名发布的对象', nullable: false })
  async to (@Parent() anonymous: Anonymous) {
    return await this.anonymousService.to(anonymous.id)
  }
}
