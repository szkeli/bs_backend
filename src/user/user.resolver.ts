import { Args, Resolver, Query, Mutation, ResolveField, Parent, InputType } from '@nestjs/graphql';
import { DbService } from 'src/db/db.service';
import { Post } from 'src/posts/models/post.model';
import { User, UserCreateInput, UserFollowOneInput, UserPostsInput, UserUpdateInput } from './models/user.model';
import { UserService } from './user.service';

@Resolver(of => User)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    private readonly dbService: DbService,
  ) {}

  @Query(returns => User || null, { name: 'user' })
  async getUser(@Args('id') id: string) {
    return await this.userService.getUser(id);
  }

  @Mutation(returns => User)
  async createUser(@Args('input') input: UserCreateInput) {
    return await this.userService.createUser(input);
  }

  @Mutation(returns => User, { name: 'updateUser' })
  async updateUser(@Args('input') input: UserUpdateInput) {
    return await this.userService.updateUser(input);
  }

  @Mutation(returns => User)
  async followOne(@Args('input') input: UserFollowOneInput) {
    return await this.userService.followOne(input);
  }

  @ResolveField(returns => [Post])
  async posts(
    @Parent() user: User, 
    @Args('input') input: UserPostsInput
  ) {
    return await this.userService.findPostsByUserId(user.id, input);
  }
}
