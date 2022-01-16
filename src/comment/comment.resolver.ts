import { UseGuards } from '@nestjs/common'
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver
} from '@nestjs/graphql'

import { CurrentUser } from 'src/auth/decorator'
import { GqlAuthGuard } from 'src/auth/gql.strategy'
import { PagingConfigArgs, User } from 'src/user/models/user.model'

import { VotesConnection } from '../votes/model/votes.model'
import { CommentService } from './comment.service'
import {
  Comment,
  CommentId,
  CommentsConnection
} from './models/comment.model'

@Resolver(_of => Comment)
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
  async comments (@Parent() comment: Comment, @Args() args: PagingConfigArgs) {
    return await this.commentService.getCommentsByCommentId(
      comment.id,
      args.first,
      args.offset
    )
  }

  @ResolveField(returns => VotesConnection)
  async votes (@CurrentUser() user: User, @Parent() comment: Comment, @Args() args: PagingConfigArgs) {
    return await this.commentService.getVotesByCommentId(user.id, comment.id, args.first, args.offset)
  }
}
