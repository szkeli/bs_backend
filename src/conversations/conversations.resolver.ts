import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { CheckPolicies, CurrentUser, Roles } from '../auth/decorator'
import { Role } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler } from '../casl/casl.handler'
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
@Resolver(of => Conversation)
export class ConversationsResolver {
  constructor (
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService
  ) {}

  @Query(of => Conversation, { description: '以id获取会话' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async conversation (@Args('id') id: string) {
    return await this.conversationsService.conversation(id)
  }

  @Query(of => ConversationsConnection, { description: '获取所有会话' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async conversations (@Args() { first, offset }: PagingConfigArgs) {
    return await this.conversationsService.conversations(first, offset)
  }

  @Mutation(of => Conversation, { description: '创建一个会话' })
  async createConversation (@CurrentUser() user: User, @Args() args: CreateConversationArgs) {
    return await this.conversationsService.createConversation(user.id, args)
  }

  @Mutation(of => Conversation, { description: '关闭一个会话' })
  async closeConversation (@CurrentUser() user: User, @Args('conversationId') conversationId: string) {
    return await this.conversationsService.closeConversation(user.id, conversationId)
  }

  @ResolveField(of => MessageItemConnection, { description: '会话中的所有消息' })
  async messages (@Parent() conversation: Conversation, @Args() { first, offset }: PagingConfigArgs) {
    return await this.messagesService.findMessagesByConversationId(conversation.id, first, offset)
  }

  @ResolveField(of => ParticipantsConnection, { description: '会话的所有参与者' })
  async participants (@Parent() conversation: Conversation, @Args() { first, offset }: PagingConfigArgs) {
    return await this.messagesService.findParticipantsByConversationId(conversation.id, first, offset)
  }
}
