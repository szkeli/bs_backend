import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { OrderPickUpResolver } from './order-pick-up.resolver'
import { OrderPickUpService } from './order-pick-up.service'
import { OrdersResolver } from './orders.resolver'
import { OrdersService } from './orders.service'

@Module({
  imports: [DbModule],
  providers: [OrdersService, OrdersResolver, OrderPickUpService, OrderPickUpResolver]
})
export class OrdersModule {}
