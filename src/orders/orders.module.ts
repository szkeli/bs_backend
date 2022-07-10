import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { OrdersResolver } from './orders.resolver'
import { OrdersService } from './orders.service'

@Module({
  providers: [OrdersService, OrdersResolver, DbService]
})
export class OrdersModule {}
