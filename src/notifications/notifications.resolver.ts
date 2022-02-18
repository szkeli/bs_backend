import { Args, Mutation, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { Comment } from '../comment/models/comment.model'
import { User } from '../user/models/user.model'
import { Notification, SetReadReplyNotificationsArgs, SetReadUpvoteNotificationsArgs } from './models/notifications.model'
import { NotificationsService } from './notifications.service'

@Resolver(of => Notification)
export class NotificationsResolver {
  constructor (private readonly notificationsService: NotificationsService) {}

  @Mutation(of => Boolean, { description: '批量已读回复通知' })
  async setReadReplyNotifications (@CurrentUser() user: User, @Args() { ids }: SetReadReplyNotificationsArgs) {
    return await this.notificationsService.setReadReplyNotifications(user.id, ids)
  }

  @Mutation(of => Boolean, { description: '批量已读点赞通知' })
  async setReadUpvoteNotifications (@CurrentUser() user: User, @Args() { ids }: SetReadUpvoteNotificationsArgs) {
    return await this.notificationsService.setReadUpvoteNotifications(user.id, ids)
  }

  @Mutation(of => Boolean, { description: '设置创建时间小于当前系统时间的所有通知为已读' })
  async setReadAllNotifications (@CurrentUser() user: User) {
    return await this.notificationsService.setReadAllNotifications(user.id)
  }

  @ResolveField(of => Comment, { description: '通知涉及的对象：用户User A 对帖子 Post或评论Comment B 发布了评论 Comment C，则C是about' })
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
