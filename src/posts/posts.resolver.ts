import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Comment } from 'src/comment/models/comment.model';
import { DbService, PostId } from 'src/db/db.service';
import { CreateAPostInput, Post } from './models/post.model';
import { PostsService } from './posts.service';
import * as gremlin from 'gremlin';
import * as pretty from "prettyjson";
import { User } from 'src/user/models/user.model';
import { UserService } from 'src/user/user.service';

@Resolver((_of: Post) => Post)
export class PostsResolver {
  constructor(
      private readonly dbService: DbService,
      private readonly postsService: PostsService,
  ) {}

  @Mutation(returns => Post)
  async createAPost(@Args('input') input: CreateAPostInput) {
    return await this.postsService.createAPost(input)
  }

  @Query(returns => Post)
  async post(@Args("id") id: PostId) {
    return await this.postsService.getAPost(id);
  }

  @ResolveField(returns => User)
  async creator(@Parent() parent: Post) {
    return await this.postsService.getUserByPostId(parent.id);
  }

  @Query(returns => [Post])
  async posts() {

    console.error("test");
    return [{
      createAt: '',
      title: 'title',
      content: 'test content',
      votes: 321093821312,
      id: 'dasdsadasdas',
    }]
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
