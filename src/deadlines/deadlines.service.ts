import { Injectable } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { AddDealineArgs, Deadline } from './models/deadlines.model'

@Injectable()
export class DeadlinesService {
  constructor (private readonly dbService: DbService) {}

  async curriculum (id: string) {
    throw new Error('Method not implemented.')
  }

  async deadline (id: string) {
    const query = `
      query v($deadlineId: string) {
        deadline(func: uid($deadlineId)) @filter(type(Deadline)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{deadline: Deadline[]}>({ query, vars: { $deadlineId: id } })
    return res.deadline[0]
  }

  async addDeadline (id: string, args: AddDealineArgs): Promise<Deadline> {
    throw new Error('Method not implemented.')
  }
}
