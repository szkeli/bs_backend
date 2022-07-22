import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { OrderPickUpResolver } from './order-pick-up.resolver'
import { OrderPickService } from './order-pick-up.service'
import { OrdersResolver } from './orders.resolver'
import { OrdersService } from './orders.service'

@Module({
  providers: [OrdersService, OrdersResolver, DbService, OrderPickService, OrderPickUpResolver]
})
export class OrdersModule {}
