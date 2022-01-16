import { Module } from '@nestjs/common'

import { MessagesResolver } from './messages.resolver'
import { MessagesService } from './messages.service'

@Module({
  providers: [MessagesResolver, MessagesService]
})
export class MessagesModule {}
