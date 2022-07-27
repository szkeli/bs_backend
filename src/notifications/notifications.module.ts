import { forwardRef, Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { PubsubsModule } from '../pubsubs/pubsubs.module'
import { SharedModule } from '../shared/shared.module'
import { NotificationsResolver } from './notifications.resolver'
import { NotificationsService } from './notifications.service'
import { UserResolver } from './user.resolver'

@Module({
  imports: [
    PubsubsModule,
    DbModule,
    forwardRef(() => SharedModule)
  ],
  providers: [NotificationsResolver, NotificationsService, UserResolver],
  exports: [NotificationsService]
})
export class NotificationsModule {}
