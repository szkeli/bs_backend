import { Injectable } from '@nestjs/common'

import { DbService } from '../db/db.service'

@Injectable()
export class OrdersService {
  constructor (private readonly dbService: DbService) {}
}
