import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { CommentId } from 'src/db/db.service';
import { CommentService } from './comment.service';
import { AddACommentOnCommentInput, AddACommentOnPostInput, Comment } from './models/comment.model';

@Resolver(of => Comment)
export class CommentResolver {
  constructor(private readonly commentService: CommentService) {}

  @Query(returns => Comment)
  async comment(@Args('id') id: CommentId) {
    return await this.commentService.getACommentById(id);
  }

  @Mutation(returns => Comment)
  async addACommentOnComment(@Args('input') input: AddACommentOnCommentInput) {
    return await this.commentService.addACommentOnComment(input);
  }

  @Mutation(returns => Comment)
  async addACommentOnPost(@Args('input') input: AddACommentOnPostInput) {
    return await this.commentService.addACommentOnPost(input);
  }

  // 评论里搜索评论
  @ResolveField(returns => [Comment])
  async comments(
    @Parent() parent: Comment,
    @Args("skip") skip: number, 
    @Args("limit") limit: number ) {
      return await this.commentService.getCommentPaging(parent, skip, limit);
  }
}

