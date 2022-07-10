import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { Conversation, ConversationId } from '../conversations/models/conversations.model'
import { User } from '../user/models/user.model'
import { MessagesService } from './messages.service'
import { AddMessageArgs, Message, MessageCreatorUnion } from './models/messages.model'

@Resolver(() => Message)
export class MessagesResolver {
  constructor (private readonly messagesService: MessagesService) {}

  @Query(of => Message, { description: '以id获取消息' })
  async message (@Args('id') id: string) {
    return await this.messagesService.message(id)
  }

  @Mutation(of => Message, { description: '向指定 Conversation 添加一条消息' })
  async addMessage (@CurrentUser() user: User, @Args() args: AddMessageArgs) {
    return await this.messagesService.addMessage(user, args)
  }

  @Mutation(of => Message, { description: '向指定的会话中添加一条消息' })
  async addMessageOnConversation (
  @CurrentUser() user: User,
    @Args('id') id: ConversationId,
    @Args('content') content: string
  ) {
    return await this.messagesService.addMessageOnConversation(user.id, id, content)
  }

  @ResolveField(of => Conversation, { description: '消息所属的会话' })
  async conversation (@Parent() message: Message) {
    return await this.messagesService.findConversationByMessageId(message.id)
  }

  @ResolveField(of => MessageCreatorUnion, { description: '消息的创建者' })
  async creator (@Parent() message: Message) {
    return await this.messagesService.findCreatorByMessageId(message.id)
  }
}
