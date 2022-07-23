import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { NotificationArgs, Person, User } from '../user/models/user.model'
import { VoteWithUnreadCountsConnection } from '../votes/model/votes.model'
import { NOTIFICATION_TYPE, NotificationsConnection } from './models/notifications.model'
import { NotificationsService } from './notifications.service'

@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly notificationsService: NotificationsService) {}

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
