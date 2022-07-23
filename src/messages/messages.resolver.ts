import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { User } from '../user/models/user.model'
import { MessagesService } from './messages.service'
import { AddMessageArgs, Message } from './models/messages.model'

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
}
