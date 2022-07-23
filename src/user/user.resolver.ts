import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { CheckPolicies, CurrentUser, MaybeAuth, NoAuth, Roles } from 'src/auth/decorator'
import { PostsConnectionWithRelay } from 'src/posts/models/post.model'
import { sign as sign_calculus } from 'src/tool'

import { Admin } from '../admin/models/admin.model'
import { Role, UserWithRoles } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler, ViewAppStatePolicyHandler } from '../casl/casl.handler'
import { CommentService } from '../comment/comment.service'
import { CommentsConnection, CommentsConnectionWithRelay } from '../comment/models/comment.model'
import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { ICredential } from '../credentials/models/credentials.model'
import { Institute } from '../institutes/models/institutes.model'
import { LessonsService } from '../lessons/lessons.service'
import { FilterLessonArgs, LessonNotificationSettings, LessonsConnection } from '../lessons/models/lessons.model'
import { WithinArgs } from '../node/models/node.model'
import { NOTIFICATION_TYPE, NotificationsConnection } from '../notifications/models/notifications.model'
import { NotificationsService } from '../notifications/notifications.service'
import { PrivilegesConnection } from '../privileges/models/privileges.model'
import { SubCampus } from '../subcampus/models/subcampus.model'
import { University } from '../universities/models/universities.models'
import { VoteWithUnreadCountsConnection } from '../votes/model/votes.model'
import {
  GENDER,
  NotificationArgs,
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

  @Query(of => PostsConnectionWithRelay, { description: '测试接口' })
  @MaybeAuth()
  async userPostsWithRelay (@CurrentUser() viewer: User, @Args('id') id: string, @Args() paging: RelayPagingConfigArgs) {
    return await this.userService.findPostsByXidWithRelay(viewer?.id, id, paging)
  }

  @ResolveField(of => CommentsConnection, { description: '当前用户发布的评论' })
  async comments (@CurrentUser() viewer: User, @Parent() user: User, @Args() { first, offset }: PagingConfigArgs) {
    return await this.commentsService.findCommentsByUid(viewer?.id, user.id, first, offset)
  }

  @ResolveField(of => CommentsConnectionWithRelay)
  async commentsWithRelay (@CurrentUser() viewer: User, @Parent() user: User, @Args() paging: RelayPagingConfigArgs) {
    return await this.commentsService.findCommentsByXidWithRelay(viewer?.id, user.id, paging)
  }

  @Query(of => CommentsConnectionWithRelay, { defaultValue: '测试接口' })
  @MaybeAuth()
  async userCommentsWithRelay (@CurrentUser() viewer: User, @Args('id') id: string, @Args() paging: RelayPagingConfigArgs) {
    return await this.commentsService.findCommentsByXidWithRelay(viewer?.id, id, paging)
  }

  @ResolveField(of => LessonsConnection, { description: '当前用户的所有课程' })
  async lessons (@Parent() user: User, @Args() args: RelayPagingConfigArgs, @Args() filter: FilterLessonArgs) {
    return await this.userService.lessons(user.id, args, filter)
  }

  @ResolveField(of => PrivilegesConnection, { description: '当前用户具有的权限' })
  async privileges (@Parent() user: User, @Args() args: RelayPagingConfigArgs) {
    return await this.userService.privileges(user.id, args)
  }

  @ResolveField(of => ICredential, { description: '当前用户的认证凭证，未认证用户为null', nullable: true })
  async credential (@Parent() user: User) {
    return await this.userService.credential(user.id)
  }

  @ResolveField(of => GENDER, { nullable: true, description: '当前用户的性别' })
  async gender (@CurrentUser() currentUser: User, @Parent() user: User) {
    return await this.userService.gender(currentUser, user)
  }

  @ResolveField(of => University, { nullable: true, description: '当前用户所在的大学' })
  async university (@CurrentUser() currentUser: User, @Parent() user: User) {
    return await this.userService.university(currentUser, user.id)
  }

  @ResolveField(of => [Institute], { nullable: true, description: '当前用户所属的学院' })
  async institutes (@CurrentUser() currentUser: User, @Parent() user: User) {
    return await this.userService.institutes(currentUser, user.id)
  }

  @ResolveField(of => [SubCampus], { nullable: true, description: '当前用户所属的校区' })
  async subCampuses (@CurrentUser() currentUser: User, @Parent() user: User) {
    return await this.userService.subCampuses(currentUser, user.id)
  }

  @Query(of => NotificationsConnection, { description: '测试接口，某用户的所有回复通知，非当前用户获取到null', nullable: true })
  async userReplyNotifications (@CurrentUser() currentUser: User, @Args('id') id: string, @Args() config: NotificationArgs, @Args() paging: RelayPagingConfigArgs) {
    if (currentUser?.id !== id) return null
    return await this.notificationsService.findReplyNotificationsByXid(id, config, paging)
  }

  @Query(of => VoteWithUnreadCountsConnection, { description: '测试接口，获取某用户所有的点赞通知，非当前用户获取到null', nullable: true })
  async userUpvoteNotifications (
  @CurrentUser() currentUser: User,
    @Args('type', { type: () => NOTIFICATION_TYPE, defaultValue: NOTIFICATION_TYPE.ALL, nullable: true }) type: NOTIFICATION_TYPE,
    @Args('id') id: string,
    @Args() paging: RelayPagingConfigArgs
  ) {
    if (currentUser?.id !== id) return null
    return await this.notificationsService.findUpvoteNotificationsByXid(id, paging, type)
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
