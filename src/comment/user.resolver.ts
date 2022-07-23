import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser, MaybeAuth } from '../auth/decorator'
import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { User } from '../user/models/user.model'
import { CommentService } from './comment.service'
import { CommentsConnectionWithRelay } from './models/comment.model'

@Resolver(of => User)
export class UserResolver {
  constructor (private readonly commentService: CommentService) {}

  @Query(of => CommentsConnectionWithRelay, { defaultValue: '测试接口' })
  @MaybeAuth()
  async userCommentsWithRelay (@CurrentUser() viewer: User, @Args('id') id: string, @Args() paging: RelayPagingConfigArgs) {
    return await this.commentService.findCommentsByXidWithRelay(viewer?.id, id, paging)
  }

  @ResolveField(of => CommentsConnectionWithRelay)
  async commentsWithRelay (@CurrentUser() viewer: User, @Parent() user: User, @Args() paging: RelayPagingConfigArgs) {
    return await this.commentService.findCommentsByXidWithRelay(viewer?.id, user.id, paging)
  }
}
