import { Args, Resolver, Query, Mutation, ResolveField, Parent } from '@nestjs/graphql';
import { DbService } from 'src/db/db.service';
import { User, UserCreateInput, UserFollowOneInput, UserUpdateInput } from './models/user.model';
import { UserService } from './user.service';

@Resolver(of => User)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    private readonly dbService: DbService,
  ) {}

  @Query(returns => User || null, { name: 'user' })
  async getUser(@Args('id') id: string) {
    return this.userService.getUser(id);
  }

  @Mutation(returns => User)
  async createUser(@Args('input') input: UserCreateInput) {
    return this.userService.createUser(input);
  }

  @Mutation(returns => User, { name: 'updateUser' })
  async updateUser(@Args('input') input: UserUpdateInput) {
    return this.userService.updateUser(input);
  }

  @Mutation(returns => User)
  async followOne(@Args('input') input: UserFollowOneInput) {
    return this.userService.followOne(input);
  }

  @ResolveField('Post')
  async Post(@Parent() user: User) {
    const { id } = user;
    console.error(id);
    return [{
      id: 21332,
      title: 'dsadsa',
      votes: 321312,
    }]
  }
}
