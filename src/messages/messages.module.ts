import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { MessagesResolver } from './messages.resolver'
import { MessagesService } from './messages.service'

@Module({
  providers: [MessagesResolver, MessagesService, DbService]
})
export class MessagesModule {}
