import { Injectable } from '@nestjs/common'

import { Comment } from '../comment/models/comment.model'
import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { Post, RelayPagingConfigArgs } from '../posts/models/post.model'
import { btoa, relayfyArrayForward } from '../tool'
import { User } from '../user/models/user.model'
import { Notification, NotificationsConnection } from './models/notifications.model'

@Injectable()
export class NotificationsService {
  async to (id: string) {
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

  async creator (id: string) {
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

  constructor (private readonly dbService: DbService) {}

  async about (id: string) {
    const query = `
        query v($notificationId: string) {
            var(func: uid($notificationId)) @filter(type(Notification)) {
                about as about @filter(type(Post) or type(Comment))
            }
            about(func: uid(about)) {
                id: uid
                expand(_all_)
                dgraph.type
            }
        }
      `
    const res = await this.dbService.commitQuery<{about: Array<(typeof PostAndCommentUnion) & {'dgraph.type': string[]}>}>({ query, vars: { $notificationId: id } })
    const about = res.about[0]

    if (about?.['dgraph.type']?.includes('Post')) {
      return new Post(about as unknown as Post)
    }
    if (about?.['dgraph.type']?.includes('Comment')) {
      return new Comment(about as unknown as Comment)
    }
  }

  async findNotificationsByXid (id: string, { orderBy, first, last, after, before }: RelayPagingConfigArgs) {
    after = btoa(after)
    before = btoa(before)

    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.findNotificationsByXidForward(id, first, after)
    }
  }

  async findNotificationsByXidForward (xid: string, first: number, after: string | null): Promise<NotificationsConnection> {
    const q1 = 'var(func: uid(notifications), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($xid: string, $after: string) {
            var(func: uid($xid)) @filter(type(User)) {
                notifications as notifications @filter(type(Notification))
            }
            ${after ? q1 : ''}

            totalCount(func: uid(notifications)) { count(uid) }
            notifications(func: uid(${after ? 'q' : 'notifications'}), orderdesc: createdAt, first: ${first}) {
                id: uid
                expand(_all_)
            }
            # 开始游标
            startNotification(func: uid(notifications), first: -1) {
                id: uid
                createdAt
            }
            # 结束游标
            endNotification(func: uid(notifications), first: 1) {
                id: uid
                createdAt
            }
        }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      notifications: Notification[]
      startNotification: Array<{createdAt: string}>
      endNotification: Array<{createdAt: string}>
    }>({ query, vars: { $xid: xid, $after: after } })

    return relayfyArrayForward<Notification>({
      totalCount: res.totalCount,
      objs: res.notifications,
      startO: res.startNotification,
      endO: res.endNotification,
      first,
      after
    })
  }
}
