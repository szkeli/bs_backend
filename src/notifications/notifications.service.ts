import { ForbiddenException, Injectable } from '@nestjs/common'

import { Comment } from '../comment/models/comment.model'
import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { PostAndCommentUnion } from '../deletes/models/deletes.model'
import { Post, RelayPagingConfigArgs } from '../posts/models/post.model'
import { btoa, ids2String, relayfyArrayForward } from '../tool'
import { NotificationArgs, User } from '../user/models/user.model'
import { Notification, NOTIFICATION_TYPE, NotificationsConnection } from './models/notifications.model'

@Injectable()
export class NotificationsService {
  async setReadNotifications (xid: string, notificationIds: string[]) {
    const query = `
      query v($xid: string) {
        var(func: uid(${ids2String(notificationIds)})) @filter(type(Notification) and uid_in(to, $xid)) {
          i as uid
        }

        patchCount(func: uid(i)) {
          count(uid)
        }
        notifications(func: uid(i)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const condition = `@if( eq(len(i), ${notificationIds.length}))`
    const mutation = {
      uid: 'uid(i)',
      isRead: true
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      patchCount: Array<{count: number}>
      notifications: Notification[]
    }>({ mutations: [{ mutation, condition }], query, vars: { $xid: xid } })

    if (res.json.patchCount[0]?.count !== notificationIds.length) {
      throw new ForbiddenException(`存在非 ${xid} 所有的通知`)
    }

    return true
  }

  async setReadNotification (xid: string, notificationId: string) {
    const query = `
      query v($xid: string, $notificationId: string) {
        # xid 是 notification 的被通知对象
        i(func: uid($notificationId)) @filter(type(Notification) and uid_in(to, $xid)) {
          i as uid
        }
        notification(func: uid($notificationId)) @filter(type(Notification)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const condition = '@if( eq(len(i), 1) )'
    const mutation = {
      uid: notificationId,
      isRead: true
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      notification: Notification[]
      i: Array<{uid: string}>
    }>({
      mutations: [{ mutation, condition }],
      query,
      vars: { $xid: xid, $notificationId: notificationId }
    })

    if (res.json.i.length !== 1) {
      throw new ForbiddenException(`用户 ${xid} 不是通知 ${notificationId} 的接收者`)
    }

    const notification = res.json.notification[0]
    if (notification) {
      notification.isRead = true
    }

    return true
  }

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

  async findNotificationsByXid (id: string, config: NotificationArgs, { orderBy, first, last, after, before }: RelayPagingConfigArgs) {
    after = btoa(after)
    before = btoa(before)

    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.findNotificationsByXidForward(id, config, first, after)
    }
  }

  async findNotificationsByXidForward (xid: string, { type, actions }: NotificationArgs, first: number, after: string | null): Promise<NotificationsConnection> {
    const q1 = 'var(func: uid(notifications), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const mayGetAll = type === NOTIFICATION_TYPE.ALL ? 'and has(isRead)' : ''
    const mayGetRead = type === NOTIFICATION_TYPE.READ ? 'and eq(isRead, true)' : ''
    const mayGetUnRead = type === NOTIFICATION_TYPE.UN_READ ? 'and eq(isRead, false)' : ''

    const mayActions = actions?.map(a => `eq(action, ${a})`)?.join(' or ')

    const query = `
        query v($xid: string, $after: string) {
            var(func: uid($xid)) @filter(type(User)) {
                notifications as notifications @filter( type(Notification) ${mayGetAll} ${mayGetRead} ${mayGetUnRead} and (${mayActions}) ) 
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
