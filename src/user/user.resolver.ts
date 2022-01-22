import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { AuthService } from 'src/auth/auth.service'
import { CurrentUser, NoAuth, Roles } from 'src/auth/decorator'
import { PostsConnection } from 'src/posts/models/post.model'
import { SubjectsConnection } from 'src/subject/model/subject.model'
import { sign as sign_calculus } from 'src/tool'

import { Admin } from '../admin/models/admin.model'
import { Role, UserWithRoles } from '../auth/model/auth.model'
import { ConversationsService } from '../conversations/conversations.service'
import { ConversationsConnection } from '../conversations/models/conversations.model'
import { ReportsConnection } from '../reports/models/reports.model'
import { ReportsService } from '../reports/reports.service'
import {
  AdminAndUserUnion,
  LoginResult,
  PagingConfigArgs,
  PersonLoginArgs,
  User,
  UserRegisterInput,
  UsersConnection
} from './models/user.model'
import { UserService } from './user.service'

@Resolver((_of: User) => User)
export class UserResolver {
  constructor (
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly conversationsService: ConversationsService,
    private readonly reportsService: ReportsService
  ) {}

  @Query(returns => LoginResult, { description: '用户登录' })
  @NoAuth()
  async login (@Args() args: PersonLoginArgs): Promise<LoginResult> {
    const v = sign_calculus(args.sign)
    return await this.authService.login(args.userId, v)
  }

  @Mutation(returns => User, { description: '用户注册' })
  @NoAuth()
  async register (@Args('input') input: UserRegisterInput) {
    input.sign = sign_calculus(input.sign)
    return await this.userService.registerAUser(input)
  }

  @Query(returns => AdminAndUserUnion, { description: '当前id对应的的用户画像' })
  @Roles(Role.User, Role.Admin)
  async whoAmI (@CurrentUser() user: UserWithRoles) {
    if (user.roles.includes(Role.Admin)) {
      return new Admin(user as unknown as Admin)
    }
    if (user.roles.includes(Role.User)) {
      return new User(user as unknown as User)
    }
  }

  @Query(returns => UsersConnection, { description: '分页返回用户' })
  async users (@Args() args: PagingConfigArgs) {
    return await this.userService.users(args.first, args.offset)
  }

  @ResolveField(returns => PostsConnection, { description: '分页返回帖子' })
  async posts (@Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
    return await this.userService.findPostsByUid(user.id, first, offset)
  }

  @ResolveField(returns => SubjectsConnection, { description: '用户创建的主题' })
  async subjects (@Parent() user: User, @Args() args: PagingConfigArgs) {
    return await this.userService.findSubjectsByUid(user.id, args.first, args.offset)
  }

  @ResolveField(returns => ConversationsConnection, { description: '用户创建的会话' })
  async conversations (@Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
    return await this.conversationsService.findConversationsByUid(user.id, first, offset)
  }

  @ResolveField(returns => ReportsConnection, { description: '用户收到的举报' })
  async reports (@Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
    return await this.reportsService.findReportsByUid(user.id, first, offset)
  }
}
