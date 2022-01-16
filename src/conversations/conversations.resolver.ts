import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { User } from '../user/models/user.model'
import { ConversationsService } from './conversations.service'
import { Conversation, CreateConversationArgs } from './models/conversations.model'

// message 和 report 的负载
@Resolver()
export class ConversationsResolver {
  constructor (private readonly conversationsService: ConversationsService) {}
  @Query(returns => Conversation)
  async conversation (id: string) {
    return await this.conversationsService.conversation(id)
  }

  @Mutation(returns => Conversation)
  async createConversation (@CurrentUser() user: User, @Args() args: CreateConversationArgs) {
    return await this.conversationsService.createConversation(user.id, args.title, args.description, args.participants)
  }
}
