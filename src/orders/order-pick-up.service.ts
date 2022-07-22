import { Injectable } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { User } from '../user/models/user.model'
import { OrderPickUp } from './models/order-pick-up.model'

@Injectable()
export class OrderPickUpService {
  constructor (private readonly dbService: DbService) {}
  async creator (orderPickUp: OrderPickUp) {
    const { id } = orderPickUp
    const query = `
        query v($id: string) {
            var(func: uid($id)) @filter(type(OrderPickUp)) {
                c as creator @filter(type(User)) 
            }
            creator(func: uid(c)) {
                id: uid
                expand(_all_)
            }
        }
    `
    const res = await this.dbService.commitQuery<{creator: User[]}>({
      query,
      vars: { $id: id }
    })

    return res.creator[0]
  }
}
