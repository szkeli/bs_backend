import { Module } from '@nestjs/common'

import { MessagesService } from '../messages/messages.service'
import { SharedModule } from '../shared/shared.module'
import { ConversationsResolver } from './conversations.resolver'
import { ConversationsService } from './conversations.service'

@Module({
  providers: [ConversationsService, ConversationsResolver, MessagesService],
  imports: [SharedModule]
})
export class ConversationsModule {}
