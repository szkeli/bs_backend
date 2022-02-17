import { Args, Mutation, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { User } from '../user/models/user.model'
import { Notification } from './models/notifications.model'
import { NotificationsService } from './notifications.service'

@Resolver(of => Notification)
export class NotificationsResolver {
  constructor (private readonly notificationsService: NotificationsService) {}

  @Mutation(of => Boolean, { description: '批量设置通知已读' })
  async setReadReplyNotifications (@CurrentUser() user: User, @Args('notificationIds', { type: () => [String] }) notificationIds: string[]) {
    return await this.notificationsService.setReadReplyNotifications(user.id, notificationIds)
  }

  @Mutation(of => Boolean, { description: '设置创建时间小于当前系统时间的所有通知为已读' })
  async setReadAllNotifications (@CurrentUser() user: User) {
    return await this.notificationsService.setReadAllNotifications(user.id)
  }

  @ResolveField(of => PostAndCommentUnion, { description: '通知涉及的对象' })
  async about (@Parent() notification: Notification) {
    return await this.notificationsService.about(notification.id)
  }

  @ResolveField(of => User, { description: '被通知的对象' })
  async to (@Parent() notification: Notification) {
    return await this.notificationsService.to(notification.id)
  }

  @ResolveField(of => User, { description: '通知的创建者，匿名评论时为空', nullable: true })
  async creator (@Parent() notification: Notification) {
    return await this.notificationsService.creator(notification.id)
  }
}
