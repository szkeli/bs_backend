import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { ConversationsResolver } from './conversations.resolver'
import { ConversationsService } from './conversations.service'

@Module({
  providers: [ConversationsService, ConversationsResolver, DbService]
})
export class ConversationsModule {}
