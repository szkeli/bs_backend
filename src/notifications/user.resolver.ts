import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { NotificationArgs, Person, User } from '../user/models/user.model'
import { VoteWithUnreadCountsConnection } from '../votes/model/votes.model'
import { NOTIFICATION_TYPE, NotificationsConnection } from './models/notifications.model'
import { NotificationsService } from './notifications.service'

@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly notificationsService: NotificationsService) {}

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

  @ResolveField(of => NotificationsConnection, { description: '回复的通知', nullable: true })
  async replyNotifications (
  @CurrentUser() currentUser: User,
    @Parent() user: User,
    @Args() config: NotificationArgs,
    @Args() paging: RelayPagingConfigArgs
  ) {
    if (currentUser?.id !== user.id) return null
    return await this.notificationsService.findReplyNotificationsByXid(user.id, config, paging)
  }

  @ResolveField(of => VoteWithUnreadCountsConnection, { description: '点赞的通知', nullable: true })
  async upvoteNotifications (
  @CurrentUser() currentUser: User,
    @Parent() user: User,
    @Args('type', { type: () => NOTIFICATION_TYPE, defaultValue: NOTIFICATION_TYPE.ALL, nullable: true }) type: NOTIFICATION_TYPE,
    @Args() paging: RelayPagingConfigArgs
  ) {
    if (currentUser?.id !== user.id) return null
    return await this.notificationsService.findUpvoteNotificationsByXid(user.id, paging, type)
  }
}
