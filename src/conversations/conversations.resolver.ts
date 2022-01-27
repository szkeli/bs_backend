import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { MessagesService } from '../messages/messages.service'
import { PagingConfigArgs, User } from '../user/models/user.model'
import { ConversationsService } from './conversations.service'
import {
  Conversation,
  ConversationsConnection,
  CreateConversationArgs,
  MessageItemConnection,
  ParticipantsConnection
} from './models/conversations.model'

// message 和 report 的负载
@Resolver((_of: Conversation) => Conversation)
export class ConversationsResolver {
  constructor (
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService
  ) {}

  @Query(returns => Conversation, { description: '返回指定的会话' })
  @Roles(Role.Admin)
  async conversation (@Args('id') id: string) {
    return await this.conversationsService.conversation(id)
  }

  @Query(() => ConversationsConnection, { description: '分页返回会话' })
  @Roles(Role.Admin)
  async conversations (@Args() { first, offset }: PagingConfigArgs) {
    return await this.conversationsService.conversations(first, offset)
  }

  @Mutation(returns => Conversation, { description: '创建一个会话' })
  async createConversation (@CurrentUser() user: User, @Args() args: CreateConversationArgs) {
    return await this.conversationsService.createConversation(user.id, args.title, args.description, args.participants)
  }

  @Mutation(of => Conversation, { description: '关闭一个会话' })
  async closeConversation (@CurrentUser() user: User, @Args('conversationId') conversationId: string) {
    return await this.conversationsService.closeConversation(user.id, conversationId)
  }

  @ResolveField(returns => MessageItemConnection, { description: '返回会话中的所有消息' })
  async messages (@Parent() conversation: Conversation, @Args() { first, offset }: PagingConfigArgs) {
    return await this.messagesService.findMessagesByConversationId(conversation.id, first, offset)
  }

  @ResolveField(returns => ParticipantsConnection, { description: '返回会话的参与者' })
  async participants (@Parent() conversation: Conversation, @Args() { first, offset }: PagingConfigArgs) {
    return await this.messagesService.findParticipantsByConversationId(conversation.id, first, offset)
  }
}
