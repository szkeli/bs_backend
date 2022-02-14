import { Injectable } from '@nestjs/common'

import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { btoa, relayfyArrayForward } from '../tool'
import { Notification, NotificationsConnection } from './models/notifications.model'

@Injectable()
export class NotificationsService {
  constructor (private readonly dbService: DbService) {}

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
