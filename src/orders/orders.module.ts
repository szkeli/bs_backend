import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { UserModule } from '../user/user.module'
import { OrderPickUpResolver } from './order-pick-up.resolver'
import { OrderPickUpService } from './order-pick-up.service'
import { OrdersResolver } from './orders.resolver'
import { OrdersService } from './orders.service'
import { PostResolver } from './post.resolver'
import { UserResolver } from './user.resolver'

@Module({
  imports: [DbModule, UserModule],
  providers: [
    OrdersService,
    OrdersResolver,
    OrderPickUpService,
    OrderPickUpResolver,
    UserResolver,
    PostResolver
  ]
})
export class OrdersModule {}
