import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Comment } from 'src/comment/models/comment.model';
import { CreateAPostInput, Post, PostsCommentsInput } from './models/post.model';
import { PostsService } from './posts.service';
import { User } from 'src/user/models/user.model';
import { UserService } from 'src/user/user.service';
import { DbService } from 'src/db/db.service';
import { PostId } from 'src/db/model/db.model';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/auth/gql.strategy';
import { CurrentUser } from 'src/auth/decorator';
import { Subject } from 'src/subject/model/subject.model';
import { SubjectService } from 'src/subject/subject.service';

@Resolver((_of: Post) => Post)
export class PostsResolver {
  constructor(
    private readonly postsService: PostsService,
    private readonly subjectService: SubjectService,
  ) {}

  @Mutation(returns => Post)
  @UseGuards(GqlAuthGuard)
  async createAPost(
    @CurrentUser() user: User,
    @Args('input') input: CreateAPostInput,
  ) {
    return await this.postsService.createAPost(user.userId, input);
  }

  @Mutation(returns => Boolean)
  @UseGuards(GqlAuthGuard)
  async deleteAPost(
    @CurrentUser() user: User,
    @Args('id') id: PostId,
  ) {
   return await this.postsService.deleteAPost(user.userId, id);
  }

  @Query(returns => Post)
  async post(@Args("id") id: PostId) {
    return await this.postsService.getAPost(id);
  }

  @ResolveField(returns => User)
  async creator(@Parent() parent: Post) {
    return await this.postsService.getUserByPostId(parent.id);
  }

  @ResolveField(returns => [Comment])
  async comments(
      @Parent() parent: Post, 
      @Args('input') input: PostsCommentsInput
  ) {
    return await this.postsService.getCommentsByPostId(parent.id, input);
  }

  @ResolveField(returns => Subject, { nullable: true })
  async subject(@Parent() post: Post) {
    const v =  await this.subjectService.findASubjectByPostId(post.id);
    return v.id ? v : null;
  }
}
