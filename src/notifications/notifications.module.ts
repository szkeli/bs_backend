import { Module } from '@nestjs/common'

import { PubsubsModule } from '../pubsubs/pubsubs.module'
import { SharedModule } from '../shared/shared.module'
import { NotificationsResolver } from './notifications.resolver'
import { NotificationsService } from './notifications.service'

@Module({
  imports: [
    PubsubsModule,
    SharedModule
  ],
  providers: [NotificationsResolver, NotificationsService]
})
export class NotificationsModule {}
