import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { NotificationsResolver } from './notifications.resolver'
import { NotificationsService } from './notifications.service'

@Module({
  providers: [NotificationsResolver, NotificationsService, DbService]
})
export class NotificationsModule {}
