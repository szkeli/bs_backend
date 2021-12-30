import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query, Mutation, ResolveField, Parent, InputType, Int } from '@nestjs/graphql';
import { AuthService } from 'src/auth/auth.service';
import { CurrentUser } from 'src/auth/decorator';
import { GqlAuthGuard } from 'src/auth/gql.strategy';
import { PagingConfigInput } from 'src/comment/models/comment.model';
import { Post } from 'src/posts/models/post.model';
import { Subject, SubjectBase, SubjectId } from 'src/subject/model/subject.model';
import { hash, sign } from 'src/tool';
import { CreateFollowRelationInput, DeleteFollowRelationInput, LoginResult, User, UserCreateInput, UserFansInput, UserFollowASubjectInput, UserFollowOneInput, UserLoginInput, UserMyFollowedsInput, UserPostsInput, UserRegisterInput, UserUnFollowOneInput, UserUpdateProfileInput } from './models/user.model';
import { UserService } from './user.service';

@Resolver((_of: User) => User)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  // 验证并签名用户 返回token
  @Mutation(returns => LoginResult, { name: 'login' })
  async signAUser(@Args('input') input: UserLoginInput): Promise<LoginResult> {
    input.sign = sign(input.sign);
    return await this.authService.login(input);
  }

  // 注册用户
  @Mutation(returns => User, { name: 'register' })
  async register(@Args('input') input: UserRegisterInput) {
    input.sign = sign(input.sign);
    return await this.userService.registerAUser(input);
  }

  @Query(returns => User)
  @UseGuards(GqlAuthGuard)
  async whoAmI(@CurrentUser() user: User) {
    return user;
  }

  @Mutation(returns => Boolean)
  @UseGuards(GqlAuthGuard)
  async followOne(
    @CurrentUser() user: User,
    @Args('input') input: UserFollowOneInput,
  ) {
    const v: CreateFollowRelationInput = {
      to: input.to,
      from: user.userId,
    }
    return await this.userService.followOne(v);
  }

  @Mutation(returns => Boolean) 
  @UseGuards(GqlAuthGuard)
  async unFollowOne(
    @CurrentUser() user: User,
    @Args('input') input: UserUnFollowOneInput,
  ) {
    const v: DeleteFollowRelationInput = {
      from: user.userId,
      to: input.to,
    }
    return await this.userService.unFollowOne(v);
  }

  @Mutation(returns => Subject)
  @UseGuards(GqlAuthGuard)
  async followASubject(
    @CurrentUser() user: User,
    @Args('id') id: SubjectId,
  ) {
    const l: UserFollowASubjectInput = {
      from: user.userId,
      to: id,
    }
    return await this.userService.followASubject(l);
  }

  @ResolveField(returns => [Post])
  async posts(
    @Parent() user: User, 
    @Args('input') input: UserPostsInput
  ) {
    return await this.userService.findPostsByUserId(user.userId, input);
  }

  @ResolveField(returns => [User])
  async fans(
    @Parent() user: User,
    @Args('input') input: UserFansInput
  ) {
    return await this.userService.findFansByUserId(user.userId, input);
  }

  @ResolveField(returns => [User])
  async myFolloweds(
    @Parent() user: User,
    @Args('input') input: UserMyFollowedsInput
  ) {
    return await this.userService.findMyFollowedsByUserId(user.userId, input);
  }

  @ResolveField(returns => Int)
  async myFollowedCount(@Parent() user: User) {
    return await this.userService.findMyFollowedCount(user.userId);
  }

  @ResolveField(returns => Int)
  async fansCount(@Parent() user: User) {
    return await this.userService.findMyFansCount(user.userId);
  }

  @ResolveField(returns => [Subject])
  async subjects(
    @Parent() user: User,
    @Args('input') input: PagingConfigInput,
  ) {
    return await this.userService.findMySubjects(user.userId, input);
  }

  @ResolveField(returns => Int)
  async subjectCount(@Parent() user: User) {
    return await this.userService.getMySubjectCount(user.userId);
  }

  @Mutation(returns => User)
  @UseGuards(GqlAuthGuard)
  async updateProfile(
    @CurrentUser() user: User,
    @Args('input') input: UserUpdateProfileInput) {
      if(input.sign) {
        input.sign = sign(input.sign)
      }
    return await this.userService.updateUser(user.userId, input);
  }



  // TODO admin

  // @Query(returns => [User])
  // async users(@Args('input') input: PagingConfigInput) {

  // }

  // @Query(returns => User || null, { name: 'user' })
  // async getUser(@Args('id') id: string) {
  //   return await this.userService.getUser(id);
  // }

  // @Mutation(returns => User)
  // async createUser(@Args('input') input: UserCreateInput) {
  //   return await this.userService.createUser(input);
  // }

  // @Mutation(returns => User)
  // async updateUser(@Args('input') input: UserUpdateProfileInput) {
  //   return await this.userService.updateUser(input);
  // }
}
