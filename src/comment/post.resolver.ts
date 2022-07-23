import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Post, RelayPagingConfigArgs } from '../posts/models/post.model'
import { PagingConfigArgs } from '../user/models/user.model'
import { CommentService } from './comment.service'
import { CommentsConnection, CommentsConnectionWithRelay } from './models/comment.model'

@Resolver(of => Post)
export class PostResolver {
  constructor (private readonly commentService: CommentService) {}

  @ResolveField(of => CommentsConnection, { description: '帖子的所有评论', deprecationReason: '请使用commentsWithRelay' })
  async comments (@Parent() post: Post, @Args() { first, offset }: PagingConfigArgs) {
    return await this.commentService.findCommentsByPostId(post.id.toString(), first, offset)
  }

  @ResolveField(of => CommentsConnectionWithRelay, { description: '获取所有评论' })
  async commentsWithRelay (@Parent() post: Post, @Args() paging: RelayPagingConfigArgs) {
    return await this.commentService.commentsWithRelay(post.id, paging)
  }
}
