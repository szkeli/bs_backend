import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Notification } from '../notifications/models/notifications.model'
import { User } from './models/user.model'

@Resolver(of => Notification)
export class NotificationResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => User, { description: '通知的创建者，匿名评论时为空', nullable: true })
  async creator (@Parent() notification: Notification) {
    const { id } = notification
    const query = `
    query v($notificationId: string) {
        var(func: uid($notificationId)) @filter(type(Notification)) {
            creator as creator @filter(type(User))
        }
        creator(func: uid(creator)) {
            id: uid
            expand(_all_)
        }
    }
  `
    const res = await this.dbService.commitQuery<{creator: User[]}>({ query, vars: { $notificationId: id } })
    return res.creator[0]
  }

  @ResolveField(of => User, { description: '被通知的对象' })
  async to (@Parent() notification: Notification) {
    const { id } = notification
    const query = `
    query v($notificationId: string) {
        var(func: uid($notificationId)) @filter(type(Notification)) {
            to as to @filter(type(User))
        }
        to(func: uid(to)) {
            id: uid
            expand(_all_)
        }
    }
  `
    const res = await this.dbService.commitQuery<{to: User[]}>({ query, vars: { $notificationId: id } })
    return res.to[0]
  }
}
