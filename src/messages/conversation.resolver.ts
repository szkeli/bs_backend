import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { Conversation, MessageItemsConnection } from '../conversations/models/conversations.model'
import { MessagesService } from './messages.service'

@Resolver(of => Conversation)
export class ConversationResolver {
  constructor (private readonly messagsService: MessagesService) {}

  @ResolveField(of => MessageItemsConnection, { description: '会话中的所有消息' })
  async messages (@Parent() conversation: Conversation, @Args() args: RelayPagingConfigArgs) {
    return await this.messagsService.messages(conversation.id, args)
  }
}
