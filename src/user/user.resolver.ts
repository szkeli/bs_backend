import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { CheckPolicies, CurrentUser, MaybeAuth, NoAuth, Roles } from 'src/auth/decorator'
import { sign as sign_calculus } from 'src/tool'

import { Admin } from '../admin/models/admin.model'
import { Role, UserWithRoles } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler, ViewAppStatePolicyHandler } from '../casl/casl.handler'
import { CommentService } from '../comment/comment.service'
import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { LessonsService } from '../lessons/lessons.service'
import { LessonNotificationSettings } from '../lessons/models/lessons.model'
import { WithinArgs } from '../node/models/node.model'
import { NotificationsService } from '../notifications/notifications.service'
import {
  GENDER,
  PagingConfigArgs,
  Person,
  PrivateSettings,
  RegisterUserArgs,
  UpdatePrivateSettingsArgs,
  UpdateUserArgs,
  User,
  UsersConnection,
  UsersConnectionWithRelay,
  UsersWithRelayFilter,
  WhoAmIUnion
} from './models/user.model'
import { UserService } from './user.service'

@Resolver((_of: User) => Person)
export class UserResolver {
  constructor (
    private readonly userService: UserService,
    private readonly commentsService: CommentService,
    private readonly notificationsService: NotificationsService,
    private readonly lessonsService: LessonsService
  ) {}

  @Mutation(of => User, { description: '注册' })
  @NoAuth()
  async register (@Args() args: RegisterUserArgs) {
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

  @Query(of => UsersConnectionWithRelay, { description: '指定时间段内认证的用户' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler(), new ViewAppStatePolicyHandler())
  async authenWithin (@Args() { startTime, endTime }: WithinArgs, @Args() args: RelayPagingConfigArgs) {
    return await this.userService.authenWithin(startTime, endTime, args)
  }

  @Mutation(of => User, { description: '更新用户画像' })
  async updateUser (@CurrentUser() user: User, @Args() args: UpdateUserArgs) {
    if (args.sign) {
      args.sign = sign_calculus(args.sign)
    }
    return await this.userService.updateUser(user.id, args)
  }

  @Query(of => WhoAmIUnion, { description: '当前id对应的的用户画像' })
  @Roles(Role.User, Role.Admin)
  async whoAmI (@CurrentUser() user: UserWithRoles) {
    if (user.roles.includes(Role.Admin)) {
      return new Admin(user as unknown as Admin)
    }
    if (user.roles.includes(Role.User)) {
      return new User(user)
    }
  }

  @Query(of => UsersConnection, { deprecationReason: '使用 usersWithRelay', description: '获取所有用户' })
  @MaybeAuth()
  async users (@Args() args: PagingConfigArgs) {
    return await this.userService.users(args.first, args.offset)
  }

  @Query(of => UsersConnectionWithRelay)
  @MaybeAuth()
  async usersWithRelay (@Args() args: RelayPagingConfigArgs, @Args() filter: UsersWithRelayFilter) {
    return await this.userService.usersWithRelay(args, filter)
  }

  @Query(of => User, { description: '以id获取用户' })
  @MaybeAuth()
  async user (@CurrentUser() viewer: User, @Args('id') id: string) {
    return await this.userService.user(viewer?.id, id)
  }

  // @ResolveField(of => CommentsConnection, { description: '当前用户发布的评论' })
  // async comments (@CurrentUser() viewer: User, @Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
  //   return await this.commentsService.findCommentsByUid(viewer?.id, user.id, first, offset)
  // }

  @ResolveField(of => GENDER, { nullable: true, description: '当前用户的性别' })
  async gender (@CurrentUser() currentUser: User, @Parent() user: User) {
    return await this.userService.gender(currentUser, user)
  }

  @ResolveField(of => PrivateSettings, { nullable: true, description: '当前用户的隐私设定' })
  async privateSettings (@Parent() user: User) {
    return await this.userService.privateSettings(user)
  }

  @ResolveField(of => LessonNotificationSettings, { description: '获取当前用户上课通知的设置' })
  async lessonNotificationSettings (@Parent() user: User) {
    return await this.lessonsService.lessonNotificationSettings(user.id)
  }

  @Mutation(of => PrivateSettings, { description: '更新当前用户的隐私信息' })
  @Roles(Role.User)
  async updatePrivateSettings (@CurrentUser() user: User, @Args() args: UpdatePrivateSettingsArgs) {
    return await this.userService.updatePrivateSettings(user, args)
  }
}
