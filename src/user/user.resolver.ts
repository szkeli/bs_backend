import { Args, Resolver, Query, Mutation, ResolveField, Parent, InputType } from '@nestjs/graphql';
import { DbService } from 'src/db/db.service';
import { Post } from 'src/posts/models/post.model';
import { User, UserCreateInput, UserFansInput, UserFollowOneInput, UserMyFollowedsInput, UserPostsInput, UserUnFollowOneInput, UserUpdateInput } from './models/user.model';
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

  @Mutation(returns => User)
  async updateUser(@Args('input') input: UserUpdateInput) {
    return await this.userService.updateUser(input);
  }

  // TODO 鉴权
  @Mutation(returns => Boolean)
  async followOne(@Args('input') input: UserFollowOneInput) {
    return await this.userService.followOne(input);
  }

  @Mutation(returns => Boolean) 
  async unFollowOne(@Args('input') input: UserUnFollowOneInput) {
    return await this.userService.unFollowOne(input);
  }

  @ResolveField(returns => [Post])
  async posts(
    @Parent() user: User, 
    @Args('input') input: UserPostsInput
  ) {
    return await this.userService.findPostsByUserId(user.id, input);
  }

  @ResolveField(returns => [User])
  async fans(
    @Parent() user: User,
    @Args('input') input: UserFansInput
  ) {
    return await this.userService.findFansByUserId(user.id, input);
  }

  @ResolveField(returns => [User])
  async myFolloweds(
    @Parent() user: User,
    @Args('input') input: UserMyFollowedsInput
  ) {
    return await this.userService.findMyFollowedsByUserIf(user.id, input);
  }
}
