import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { Conversation, ConversationId } from '../conversations/models/conversations.model'
import { User } from '../user/models/user.model'
import { MessagesService } from './messages.service'
import { Message } from './models/messages.model'

@Resolver(() => Message)
export class MessagesResolver {
  constructor (private readonly messagesService: MessagesService) {}

  @Query(returns => Message, { description: '返回指定的消息' })
  async message (@Args('id') id: string) {
    return await this.messagesService.message(id)
  }

  @ResolveField(() => Conversation, { description: '返回消息所属的会话' })
  async conversation (@Parent() message: Message) {
    return await this.messagesService.findConversationByMessageId(message.id)
  }

  @Mutation(returns => Message, { description: '向指定的会话中添加一条消息' })
  async addMessageOnConversation (
  @CurrentUser() user: User,
    @Args('id') id: ConversationId,
    @Args('content') content: string
  ) {
    return await this.messagesService.addMessageOnConversation(user.id, id, content)
  }
}
