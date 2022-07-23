import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { ConversationResolver } from './conversation.resolver'
import { MessagesResolver } from './messages.resolver'
import { MessagesService } from './messages.service'

@Module({
  providers: [MessagesResolver, MessagesService, ConversationResolver],
  imports: [SharedModule, DbModule],
  exports: [MessagesService]
})
export class MessagesModule {}
