import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { MessagesResolver } from './messages.resolver'
import { MessagesService } from './messages.service'

@Module({
  providers: [MessagesResolver, MessagesService],
  imports: [SharedModule]
})
export class MessagesModule {}
