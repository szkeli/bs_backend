import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { AuthService } from 'src/auth/auth.service'
import { CheckPolicies, CurrentUser, MaybeAuth, NoAuth, Roles } from 'src/auth/decorator'
import { PostsConnection } from 'src/posts/models/post.model'
import { SubjectsConnection } from 'src/subject/model/subject.model'
import { RawUser2UserWithPrivateProps, sign as sign_calculus } from 'src/tool'

import { Admin } from '../admin/models/admin.model'
import { Role, UserWithRoles } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler, ViewAppStatePolicyHandler } from '../casl/casl.handler'
import { CommentService } from '../comment/comment.service'
import { CommentsConnection } from '../comment/models/comment.model'
import { ConversationsService } from '../conversations/conversations.service'
import { ConversationsConnection } from '../conversations/models/conversations.model'
import { CurriculumsService } from '../curriculums/curriculums.service'
import { CurriculumsConnection } from '../curriculums/models/curriculums.model'
import { DeadlinesService } from '../deadlines/deadlines.service'
import { DeadlinesConnection } from '../deadlines/models/deadlines.model'
import { WithinArgs } from '../node/models/node.model'
import { PrivilegesConnection } from '../privileges/models/privileges.model'
import { ReportsConnection } from '../reports/models/reports.model'
import { ReportsService } from '../reports/reports.service'
import { VotesConnection } from '../votes/model/votes.model'
import { VotesService } from '../votes/votes.service'
import {
  AdminAndUserWithPrivatePropsUnion,
  CreateUserArgs,
  DeadlinesPagingArgs,
  LoginResult,
  PagingConfigArgs,
  Person,
  PersonLoginArgs,
  UpdateUserArgs,
  User,
  UsersConnection,
  UserWithPrivateProps
} from './models/user.model'
import { UserService } from './user.service'

@Resolver((_of: User) => Person)
export class UserResolver {
  constructor (
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly conversationsService: ConversationsService,
    private readonly reportsService: ReportsService,
    private readonly deadlinesService: DeadlinesService,
    private readonly curriculumsService: CurriculumsService,
    private readonly votesService: VotesService,
    private readonly commentsService: CommentService
  ) {}

  @Mutation(of => LoginResult, { description: '登录' })
  @NoAuth()
  async login (@Args() args: PersonLoginArgs): Promise<LoginResult> {
    const v = sign_calculus(args.sign)
    return await this.authService.login(args.userId, v)
  }

  @Mutation(of => LoginResult, { description: '通过小程序的code进行登录' })
  @NoAuth()
  async loginByCode (@Args('code') code: string) {
    return await this.authService.loginByCode(code)
  }

  @Mutation(of => User, { description: '注册' })
  @NoAuth()
  async register (@Args() args: CreateUserArgs) {
    args.sign = sign_calculus(args.sign)
    return await this.userService.registerUser(args)
  }

  @Mutation(of => Boolean, { description: '用于调试的接口: 根据userId 删除一个刚创建的用户，该用户不能有点赞评论发帖等操作' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async pureDeleteUser (@CurrentUser() admin: Admin, @Args('userId') userId: string) {
    return await this.userService.pureDeleteUser(admin.id, userId)
  }

  @Query(of => UsersConnection, { description: '指定时间段内注册的所有用户' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler(), new ViewAppStatePolicyHandler())
  async registerWithin (@Args() { startTime, endTime }: WithinArgs, @Args() { first, offset }: PagingConfigArgs) {
    return await this.userService.registerWithin(startTime, endTime, first, offset)
  }

  @Mutation(of => User, { description: '更新用户画像' })
  async updateUser (@CurrentUser() user: User, @Args() args: UpdateUserArgs) {
    args.sign && sign_calculus(args.sign)
    return await this.userService.updateUser(user.id, args)
  }

  @Query(of => AdminAndUserWithPrivatePropsUnion, { description: '当前id对应的的用户画像' })
  @Roles(Role.User, Role.Admin)
  async whoAmI (@CurrentUser() user: UserWithRoles) {
    if (user.roles.includes(Role.Admin)) {
      return new Admin(user as unknown as Admin)
    }
    if (user.roles.includes(Role.User)) {
      const userWithPrivateProps = RawUser2UserWithPrivateProps(user)
      return new UserWithPrivateProps(userWithPrivateProps)
    }
  }

  @Query(of => UsersConnection, { description: '获取所有用户' })
  @MaybeAuth()
  async users (@Args() args: PagingConfigArgs) {
    return await this.userService.users(args.first, args.offset)
  }

  @Query(of => User, { description: '以id获取用户' })
  @MaybeAuth()
  async user (@CurrentUser() viewer: User, @Args('id') id: string) {
    return await this.userService.user(viewer?.id, id)
  }

  @ResolveField(of => PostsConnection, { description: '当前用户创建的所有帖子' })
  async posts (
  @CurrentUser() viewer: User,
    @Parent() user: User,
    @Args() { first, offset }: PagingConfigArgs
  ) {
    return await this.userService.findPostsByUid(viewer?.id, user.id, first, offset)
  }

  @ResolveField(of => VotesConnection, { description: '当前用户的所有点赞' })
  async votes (@Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
    return await this.votesService.findVotesByUid(user.id, first, offset)
  }

  @ResolveField(of => CommentsConnection, { description: '当前用户发布的评论' })
  async comments (
  @CurrentUser() viewer: User,
    @Parent() user: User,
    @Args() { first, offset }: PagingConfigArgs
  ) {
    return await this.commentsService.findCommentsByUid(viewer?.id, user.id, first, offset)
  }

  @ResolveField(of => SubjectsConnection, { description: '当前用户创建的所有主题' })
  async subjects (@Parent() user: User, @Args() args: PagingConfigArgs) {
    return await this.userService.findSubjectsByUid(user.id, args.first, args.offset)
  }

  @ResolveField(of => ConversationsConnection, { description: '当前用户创建的所有会话' })
  async conversations (@Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
    return await this.conversationsService.findConversationsByUid(user.id, first, offset)
  }

  @ResolveField(of => ReportsConnection, { description: '当前用户收到的所有举报' })
  async reports (@Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
    return await this.reportsService.findReportsByUid(user.id, first, offset)
  }

  @ResolveField(of => DeadlinesConnection, { description: '当前用户的ddl信息' })
  async deadlines (@Parent() user: User, @Args() { startTime, endTime, first }: DeadlinesPagingArgs) {
    return await this.deadlinesService.findDeadlinesByUId(
      user.id,
      startTime,
      endTime,
      first
    )
  }

  @ResolveField(of => CurriculumsConnection, { description: '当前用户的课程信息' })
  async curriculums (@Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
    return await this.curriculumsService.findCurriculumsByUid(user.id, first, offset)
  }

  @ResolveField(of => PrivilegesConnection, { description: '当前用户具有的权限' })
  async privileges (@Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
    return await this.userService.privileges(user.id, first, offset)
  }
}
