import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { ConversationId } from '../conversations/models/conversations.model'
import { PagingConfigArgs, User } from '../user/models/user.model'
import { MessagesService } from './messages.service'
import { Message, MessagesConnection } from './models/messages.model'

@Resolver()
export class MessagesResolver {
  constructor (private readonly messagesService: MessagesService) {}
  @Query(returns => MessagesConnection)
  async messages (@CurrentUser() user: User, @Args() args: PagingConfigArgs) {
    return await this.messagesService.messages(args.first, args.offset)
  }

  @Query(returns => Message)
  async message (id: string) {
    return await this.messagesService.message(id)
  }

  @Mutation(returns => Message)
  async addMessageOnConversation (
  @CurrentUser() user: User,
    @Args('id') id: ConversationId,
    @Args('content') content: string
  ) {
    return await this.messagesService.addMessageOnConversation(user.id, id, content)
  }
}
