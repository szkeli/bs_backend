import { Resolver, Args, Int, ResolveField, Parent, Query } from "@nestjs/graphql";
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
      posts: [],
    }
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