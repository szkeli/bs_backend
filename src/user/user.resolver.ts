import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { AuthService } from 'src/auth/auth.service'
import { CurrentUser, NoAuth, Roles } from 'src/auth/decorator'
import { PostsConnection } from 'src/posts/models/post.model'
import { SubjectsConnection } from 'src/subject/model/subject.model'
import { RawUser2UserWithPrivateProps, sign as sign_calculus } from 'src/tool'

import { Admin } from '../admin/models/admin.model'
import { Role, UserWithRoles } from '../auth/model/auth.model'
import { ConversationsService } from '../conversations/conversations.service'
import { ConversationsConnection } from '../conversations/models/conversations.model'
import { CurriculumsService } from '../curriculums/curriculums.service'
import { CurriculumsConnection } from '../curriculums/models/curriculums.model'
import { DeadlinesService } from '../deadlines/deadlines.service'
import { DeadlinesConnection } from '../deadlines/models/deadlines.model'
import { ReportsConnection } from '../reports/models/reports.model'
import { ReportsService } from '../reports/reports.service'
import {
  AdminAndUserWithPrivatePropsUnion,
  CreateUserArgs,
  DeadlinesPagingArgs,
  LoginResult,
  PagingConfigArgs,
  PersonLoginArgs,
  UpdateUserArgs,
  User,
  UsersConnection,
  UserWithPrivateProps
} from './models/user.model'
import { UserService } from './user.service'

@Resolver((_of: User) => UserWithPrivateProps)
export class UserResolver {
  constructor (
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly conversationsService: ConversationsService,
    private readonly reportsService: ReportsService,
    private readonly deadlinesService: DeadlinesService,
    private readonly curriculumsService: CurriculumsService
  ) {}

  @Mutation(of => LoginResult, { description: '登录' })
  @NoAuth()
  async login (@Args() args: PersonLoginArgs): Promise<LoginResult> {
    const v = sign_calculus(args.sign)
    return await this.authService.login(args.userId, v)
  }

  @Mutation(of => User, { description: '注册' })
  @NoAuth()
  async register (@Args() args: CreateUserArgs) {
    args.sign = sign_calculus(args.sign)
    return await this.userService.registerUser(args)
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
  async users (@Args() args: PagingConfigArgs) {
    return await this.userService.users(args.first, args.offset)
  }

  @ResolveField(of => PostsConnection, { description: '当前用户创建的所有帖子' })
  async posts (@Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
    return await this.userService.findPostsByUid(user.id, first, offset)
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
}
