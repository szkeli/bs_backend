import { UseGuards } from '@nestjs/common'
import {
  Args,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver
} from '@nestjs/graphql'

import { CurrentUser } from 'src/auth/decorator'
import { GqlAuthGuard } from 'src/auth/gql.strategy'
import { User } from 'src/user/models/user.model'

import { CommentService } from './comment.service'
import {
  Comment,
  CommentId,
  CommentsConnection
} from './models/comment.model'

@Resolver(of => Comment)
export class CommentResolver {
  constructor (private readonly commentService: CommentService) {}

  @Query(returns => Comment)
  async comment (@Args('id') id: CommentId) {
    return await this.commentService.comment(id)
  }

  @Mutation(returns => Comment)
  @UseGuards(GqlAuthGuard)
  async addACommentOnComment (
  @CurrentUser() user: User,
    @Args('content') content: string,
    @Args('to', { description: '相应的评论的id' }) to: string
  ) {
    return await this.commentService.addACommentOnComment(
      user.id,
      content,
      to
    )
  }

  @Mutation(returns => Comment)
  @UseGuards(GqlAuthGuard)
  async addACommentOnPost (
    @CurrentUser() user: User,
      @Args('content') content: string,
      @Args('to', { description: '相应的帖子的id' }) to: string
  ): Promise<Comment> {
    return await this.commentService.addACommentOnPost(user.id, content, to)
  }

  @ResolveField(returns => CommentsConnection)
  async comments (
  @Parent() comment: Comment,
    @Args('first', { nullable: true, type: () => Int, defaultValue: 0 }) first: number,
    @Args('offset', { nullable: true, type: () => Int, defaultValue: 2 }) offset: number
  ) {
    return await this.commentService.getCommentsByCommentId(
      comment.id,
      first,
      offset
    )
  }
}
