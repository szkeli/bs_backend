import { ForbiddenException } from '@nestjs/common'
import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Message } from '../messages/models/messages.model'
import { Conversation } from './models/conversations.model'

@Resolver(of => Message)
export class MessageResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => Conversation, { description: '消息所属的会话' })
  async conversation (@Parent() message: Message) {
    const { id } = message
    const query = `
    query v($messageId: string) {
      message(func: uid($messageId)) @filter(type(Message)) {
        id: uid
        conversation @filter(type(Conversation)) {
          id: uid
          expand(_all_)
        }
      }
    }
  `
    const res = await this.dbService.commitQuery<{message: Array<{conversation: Conversation}>}>({
      query,
      vars: {
        $messageId: id
      }
    })
    if (res.message.length !== 1) {
      throw new ForbiddenException(`消息 ${id} 不存在`)
    }
    if (!res.message[0].conversation) {
      throw new ForbiddenException(`消息 ${id} 没有会话`)
    }
    return res.message[0].conversation
  }
}
