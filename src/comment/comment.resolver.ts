import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { CurrentUser } from 'src/auth/decorator';
import { GqlAuthGuard } from 'src/auth/gql.strategy';
import { User } from 'src/user/models/user.model';
import { CommentService } from './comment.service';
import { AddACommentOnCommentInput, AddACommentOnPostInput, Comment, CommentId, PagingConfigInput } from './models/comment.model';

@Resolver(of => Comment)
export class CommentResolver {
  constructor(private readonly commentService: CommentService) {}

  @Query(returns => Comment)
  async comment(@Args('id') id: CommentId) {
    return await this.commentService.getACommentById(id);
  }

  @Mutation(returns => Comment)
  @UseGuards(GqlAuthGuard)
  async addACommentOnComment(
    @CurrentUser() user: User,
    @Args('input') input: AddACommentOnCommentInput,
  ) {
    return await this.commentService.addACommentOnComment(user.userId, input);
  }

  @Mutation(returns => Comment)
  @UseGuards(GqlAuthGuard)
  async addACommentOnPost(
    @CurrentUser() user: User,
    @Args('input') input: AddACommentOnPostInput,
  ) {
    return await this.commentService.addACommentOnPost(user.userId, input);
  }

  // 评论里搜索评论
  @ResolveField(returns => [Comment])
  async comments(
    @Parent() parent: Comment,
    @Args('input') input: PagingConfigInput,
  ) {
      return await this.commentService.getCommentsByCommentId(parent.id, input);
  }
}

