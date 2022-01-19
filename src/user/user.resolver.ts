import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { AuthService } from 'src/auth/auth.service'
import { CurrentJwtToken, CurrentUser, NoAuth } from 'src/auth/decorator'
import { PostsConnection } from 'src/posts/models/post.model'
import { Subject, SubjectId, SubjectsConnection } from 'src/subject/model/subject.model'
import { sign as sign_calculus } from 'src/tool'

import { CommentsConnection } from '../comment/models/comment.model'
import { ConversationsService } from '../conversations/conversations.service'
import { ConversationsConnection } from '../conversations/models/conversations.model'
import { DbService } from '../db/db.service'
import { ReportsConnection } from '../reports/models/reports.model'
import { ReportsService } from '../reports/reports.service'
import {
  CreateFollowRelationInput,
  DeleteFollowRelationInput,
  FolloweringsConnection,
  FollowersConnection,
  LoginResult,
  PagingConfigArgs,
  PersonLoginArgs,
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
    private readonly dbService: DbService,
    private readonly conversationsService: ConversationsService,
    private readonly reportsService: ReportsService
  ) {}

  // 验证并签名用户 返回token
  @Query(returns => LoginResult)
  @NoAuth()
  async login (@Args() args: PersonLoginArgs): Promise<LoginResult> {
    const v = sign_calculus(args.sign)
    return await this.authService.login(args.userId, v)
  }

  // 注册用户
  @Mutation(returns => User)
  @NoAuth()
  async register (@Args('input') input: UserRegisterInput) {
    input.sign = sign_calculus(input.sign)
    return await this.userService.registerAUser(input)
  }

  @Query(returns => User)
  async whoAmI (@CurrentUser() user: User, @CurrentJwtToken() token: string) {
    return user
  }

  @Query(returns => UsersConnection)
  async users (@Args() args: PagingConfigArgs) {
    return await this.userService.users(args.first, args.offset)
  }

  @Mutation(returns => Boolean)
  async followUser (@CurrentUser() user: User, @Args('to') to: string) {
    const v: CreateFollowRelationInput = {
      to,
      from: user.userId
    }
    return await this.userService.followOne(v)
  }

  @Mutation(returns => Boolean)
  async unfollowUser (@CurrentUser() user: User, @Args('to') to: string) {
    const v: DeleteFollowRelationInput = {
      from: user.userId,
      to
    }
    return await this.userService.unfollowOne(v)
  }

  @Mutation(returns => Subject)
  async followSubject (@CurrentUser() user: User, @Args('id') id: SubjectId) {
    const l: UserFollowASubjectInput = {
      from: user.userId,
      to: id
    }
    return await this.userService.followASubject(l)
  }

  @ResolveField(returns => PostsConnection)
  async posts (@Parent() user: User, @Args() args: PagingConfigArgs) {
    return await this.userService.findPostsByUid(
      user.id,
      args.first,
      args.offset
    )
  }

  @ResolveField(returns => FollowersConnection)
  async followers (@Parent() user: User, @Args() args: PagingConfigArgs) {
    throw new Error('undefined')
    // return await this.userService.findFansByUserId(
    //   user.userId,
    //   input
    // )
  }

  @ResolveField(returns => FolloweringsConnection)
  async followings (@Parent() user: User, @Args() args: PagingConfigArgs) {
    throw new Error('undefined')
    // return await this.userService.findMyFollowedsByUserId(
    //   user.userId,
    //   input
    // )
  }

  @ResolveField(returns => SubjectsConnection)
  async subjects (@Parent() user: User, @Args() args: PagingConfigArgs) {
    return await this.userService.findSubjectsByUid(user.id, args.first, args.offset)
  }

  @ResolveField(returns => CommentsConnection)
  async comments (@Parent() user: User, @Args() args: PagingConfigArgs) {
    // 返回我的评论
    throw new Error('undefined')
    // return await this.userService.findMySubjects(user.userId, input)
  }

  @ResolveField(returns => ConversationsConnection)
  async conversations (@Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
    return await this.conversationsService.findConversationsByUid(user.id, first, offset)
  }

  @ResolveField(returns => ReportsConnection, { description: '当前用户收到的举报' })
  async reports (@Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
    return await this.reportsService.findReportsByUid(user.id, first, offset)
  }

  @Mutation(returns => User, { description: '更新当前用户' })
  async updateUser (@CurrentUser() user: User, @Args() args: UserUpdateProfileInput
  ) {
    if (args.sign) {
      args.sign = sign_calculus(args.sign)
    }
    return await this.userService.updateUser(user.userId, args)
  }
}
