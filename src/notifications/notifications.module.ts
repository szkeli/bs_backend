import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { PubsubsModule } from '../pubsubs/pubsubs.module'
import { NotificationsResolver } from './notifications.resolver'
import { NotificationsService } from './notifications.service'

@Module({
  imports: [
    PubsubsModule
  ],
  providers: [NotificationsResolver, NotificationsService, DbService]
})
export class NotificationsModule {}
