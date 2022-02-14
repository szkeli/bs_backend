import { Module } from '@nestjs/common'

import { NotificationsResolver } from './notifications.resolver'
import { NotificationsService } from './notifications.service'

@Module({
  providers: [NotificationsResolver, NotificationsService]
})
export class NotificationsModule {}
