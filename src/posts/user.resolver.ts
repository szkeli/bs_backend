import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { PagingConfigArgs, Person, User } from '../user/models/user.model'
import { UserService } from '../user/user.service'
import { PostsConnection, PostsConnectionWithRelay, RelayPagingConfigArgs } from './models/post.model'

@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly userService: UserService) {}

  @ResolveField(of => PostsConnection, { description: '当前用户创建的所有帖子' })
  async posts (@CurrentUser() viewer: User, @Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
    return await this.userService.findPostsByUid(viewer?.id, user.id, first, offset)
  }

  @ResolveField(of => PostsConnectionWithRelay)
  async postsWithRelay (@CurrentUser() viewer: User, @Parent() user: User, @Args() paging: RelayPagingConfigArgs) {
    return await this.userService.findPostsByXidWithRelay(viewer?.id, user.id, paging)
  }
}