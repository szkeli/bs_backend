import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { User } from '../user/models/user.model'
import { AnonymousService } from './anonymous.service'
import { Anonymous } from './models/anonymous.model'

@Resolver(of => Anonymous)
export class AnonymousResolver {
  constructor (private readonly anonymousService: AnonymousService) {}

  @ResolveField(of => User, { description: '匿名的创建者，只有创建者自己可见', nullable: true })
  async creator (@Parent() anonymous: Anonymous, @CurrentUser() user: User) {
    return await this.anonymousService.creator(anonymous.id, user.id)
  }

  @ResolveField(of => PostAndCommentUnion, { description: '被匿名发布的对象', nullable: false })
  async to (@Parent() anonymous: Anonymous) {
    return await this.anonymousService.to(anonymous.id)
  }
}
