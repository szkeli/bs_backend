import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Comment } from 'src/comment/models/comment.model';
import { DbService, PostId } from 'src/db/db.service';
import { Post } from './models/post.model';
import { PostsService } from './posts.service';

@Resolver(of => Post)
export class PostsResolver {
  constructor(
      private readonly dbService: DbService,
      private readonly postsService: PostsService,
  ) {}

  @Query(returns => [Post])
  async posts() {

  }

  @Query(returns => Post)
  async post(@Args("id") id: PostId) {
    const a: Post = {
      createAt: '23132',
      title: 'title',
      content: 'content',
      votes: 21321321,
      id,
    };
    return a;
  }

  @ResolveField(returns => [Comment])
  async comments(
      @Parent() parent: Post, 
      @Args("skip", { nullable: true, defaultValue: 0 }) skip: number,
      @Args("limit", { nullable: true, defaultValue: 10 }) limit: number,
  ) {
    return this.postsService.commentsPaging(parent, skip, limit);
  }
}
