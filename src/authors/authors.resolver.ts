import { Resolver, Args, Int, ResolveField, Parent, Query, Mutation } from "@nestjs/graphql";
import { Post } from "src/posts/models/post.model";
import { PostsService } from "src/posts/posts.service";
import { AuthorsService } from "./authors.service";
import { Author } from "./models/author.model";

@Resolver(of => Author)
export class AuthorsResolver {
  constructor(
    private authorsService: AuthorsService,
    private postsService: PostsService,
  ) {}

  @Query(returns => Author, { name: 'author' })
  async getAuthor(@Args('id') id: number) {
    // return this.authorsService.findOneById(id);
    return {
      id: 2121,
      firstName: 'ahhaha',
      lastName: 'dsadsa',
    }
  }

  @Mutation(returns => Post, { name: 'upvote_post' })
  async upvotePost(@Args({ name: 'postId', type: () => Int }) postId: number) {
    return await this.postsService.upvoteById({ id: postId });
  }

  @ResolveField('posts')
  async posts(@Parent() author: Author) {
    const { id } = author;
    return [{
      id: 321,
      title: '',
      votes: 12,
    }];
    // return this.postsService.findAll({ authorId: id });
  }
}