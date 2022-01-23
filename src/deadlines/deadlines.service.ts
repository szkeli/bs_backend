import { ForbiddenException, Injectable } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { AddDealineArgs, Deadline } from './models/deadlines.model'

@Injectable()
export class DeadlinesService {
  constructor (private readonly dbService: DbService) {}
  async deadline (id: string) {
    const query = `
      query v($deadlineId: string) {
        id: uid
        expand(_all_)
      }
    `
    const res = await this.dbService.commitQuery({ query, vars: { $deadlineId: id } })
    console.error(res)
  }

  async addDeadline (id: string, args: AddDealineArgs): Promise<Deadline> {
    const query = `
      query v($userId: string) {
        v(func: uid($userId)) { v as uid }
      }
    `
    const condition = '@if( eq(len(v), 1) )'
    const mutation = {
      uid: '_:deadline',
      'dgraph.type': 'Deadline',
      courseContentId: args.courseContentId,
      courseId: args.courseId,
      ownerUserId: args.ownerUserId,
      notificationIds: args.notificationIds,
      parentId: args.parentId,
      sourceId: args.sourceId,
      courseName: args.courseName,
      dataPending: args.dataPending,
      dateAdded: args.dateAdded,
      startDate: args.startDate,
      endDate: args.endDate,
      dueDate: args.dueDate,
      eventType: args.eventType,
      eventUrl: args.eventUrl,
      groupCount: args.groupCount,
      ownerName: args.ownerName,
      receiverCount: args.receiverCount,
      recipientType: args.recipientType,
      seen: args.seen,
      sourceData: args.sourceData,
      sourceDataType: args.sourceDataType,
      sourceType: args.sourceType,
      title: args.title,
      type: args.type,
      viewId: args.viewId,
      creator: {
        uid: id,
        deadlines: {
          uid: '_:deadline'
        }
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
    }>({
      mutations: [{
        mutation,
        condition
      }],
      query,
      vars: {
        $userId: id
      }
    })
    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`用户 ${id} 不存在`)
    }
    return {
      id: res.uids.get('deadline'),
      ...args
    }
  }
}
