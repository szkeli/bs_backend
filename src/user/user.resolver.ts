import { UseGuards } from '@nestjs/common'
import { Args, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { AuthService } from 'src/auth/auth.service'
import { CurrentUser } from 'src/auth/decorator'
import { GqlAuthGuard } from 'src/auth/gql.strategy'
import { PostsConnection } from 'src/posts/models/post.model'
import { Subject, SubjectId, SubjectsConnection } from 'src/subject/model/subject.model'
import { sign as sign_calculus } from 'src/tool'

import { CommentsConnection } from '../comment/models/comment.model'
import { DbService } from '../db/db.service'
import { UserId } from '../db/model/db.model'
import {
  CreateFollowRelationInput,
  DeleteFollowRelationInput,
  FolloweringsConnection,
  FollowersConnection,
  LoginResult,
  User,
  UserFollowASubjectInput,
  UserRegisterInput,
  UsersConnection,
  UserUpdateProfileInput
} from './models/user.model'
import { UserService } from './user.service'

@Resolver((_of: User) => User)
export class UserResolver {
  constructor (
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly dbService: DbService
  ) {}

  // 验证并签名用户 返回token
  @Query(returns => LoginResult, { name: 'login' })
  async signAUser (
    @Args('userId') userId: string,
      @Args('sign') sign: string
  ): Promise<LoginResult> {
    const v = sign_calculus(sign)
    return await this.authService.login(userId, v)
  }

  @Mutation(returns => LoginResult)
  async authenticate (@Args('userId') userId: UserId, sign: String) {
    const r = await this.dbService.test()
    console.error(r)
    return {
      token: 'dsadsaokdsaoi'
    }
  }

  // 注册用户
  @Mutation(returns => User, { name: 'register' })
  async register (@Args('input') input: UserRegisterInput) {
    input.sign = sign_calculus(input.sign)
    return await this.userService.registerAUser(input)
  }

  @Query(returns => User)
  @UseGuards(GqlAuthGuard)
  async whoAmI (@CurrentUser() user: User) {
    return user
  }

  @Query(returns => UsersConnection)
  async users (
  @Args('after') after: String,
    @Args('before') before: String,
    @Args('first') first: Number,
    @Args('last') last: Number
  ) {
    throw new Error('undefined')
  }

  @Mutation(returns => Boolean)
  @UseGuards(GqlAuthGuard)
  async followUser (
  @CurrentUser() user: User,
    @Args('to') to: string
  ) {
    const v: CreateFollowRelationInput = {
      to,
      from: user.userId
    }
    return await this.userService.followOne(v)
  }

  @Mutation(returns => Boolean)
  @UseGuards(GqlAuthGuard)
  async unfollowUser (
  @CurrentUser() user: User,
    @Args('to') to: string
  ) {
    const v: DeleteFollowRelationInput = {
      from: user.userId,
      to
    }
    return await this.userService.unfollowOne(v)
  }

  @Mutation(returns => Subject)
  @UseGuards(GqlAuthGuard)
  async followSubject (
  @CurrentUser() user: User,
    @Args('id') id: SubjectId
  ) {
    const l: UserFollowASubjectInput = {
      from: user.userId,
      to: id
    }
    return await this.userService.followASubject(l)
  }

  @ResolveField(returns => PostsConnection)
  @UseGuards(GqlAuthGuard)
  async posts (
  @Parent() user: User,
    @Args('first', { type: () => Int, nullable: true, defaultValue: 2 }) first: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset: number
  ) {
    return await this.userService.findPostsByUid(
      user.id,
      first,
      offset
    )
  }

  @ResolveField(returns => FollowersConnection)
  @UseGuards(GqlAuthGuard)
  async followers (
  @Parent() user: User,
    @Args('after') after: String,
    @Args('before') before: String,
    @Args('first') first: Number,
    @Args('last') last: Number
  ) {
    throw new Error('undefined')
    // return await this.userService.findFansByUserId(
    //   user.userId,
    //   input
    // )
  }

  @ResolveField(returns => FolloweringsConnection)
  @UseGuards(GqlAuthGuard)
  async followings (
  @Parent() user: User,
    @Args('after') after: String,
    @Args('before') before: String,
    @Args('first') first: Number,
    @Args('last') last: Number
  ) {
    throw new Error('undefined')
    // return await this.userService.findMyFollowedsByUserId(
    //   user.userId,
    //   input
    // )
  }

  @ResolveField(returns => SubjectsConnection)
  @UseGuards(GqlAuthGuard)
  async subjects (
  @Parent() user: User,
    @Args('after') after: String,
    @Args('before') before: String,
    @Args('first') first: Number,
    @Args('last') last: Number
  ) {
    // 返回我创建的主题
    throw new Error('undefined')
    // return await this.userService.findMySubjects(user.userId, input)
  }

  @ResolveField(returns => CommentsConnection)
  @UseGuards(GqlAuthGuard)
  async comments (
  @Parent() user: User,
    @Args('after') after: String,
    @Args('before') before: String,
    @Args('first') first: Number,
    @Args('last') last: Number
  ) {
    // 返回我创建的主题
    throw new Error('undefined')
    // return await this.userService.findMySubjects(user.userId, input)
  }

  @Mutation(returns => User)
  @UseGuards(GqlAuthGuard)
  async updateUser (
  @CurrentUser() user: User,
    @Args('input') input: UserUpdateProfileInput
  ) {
    if (input.sign) {
      input.sign = sign_calculus(input.sign)
    }
    return await this.userService.updateUser(user.userId, input)
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
