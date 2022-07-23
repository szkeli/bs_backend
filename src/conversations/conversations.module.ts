import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { MessagesModule } from '../messages/messages.module'
import { SharedModule } from '../shared/shared.module'
import { ConversationsResolver } from './conversations.resolver'
import { ConversationsService } from './conversations.service'

@Module({
  providers: [ConversationsService, ConversationsResolver],
  imports: [SharedModule, DbModule, MessagesModule]
})
export class ConversationsModule {}
