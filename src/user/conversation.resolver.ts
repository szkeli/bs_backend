import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Conversation } from '../conversations/models/conversations.model'
import { DbService } from '../db/db.service'
import { User } from './models/user.model'

@Resolver(of => Conversation)
export class ConversationResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => [User], { description: '会话的所有参与者' })
  async participants (@Parent() conversation: Conversation) {
    const { id } = conversation
    const query = `
    query v($id: string) {
      var(func: uid($id)) @filter(type(Conversation)) {
        p as participants @filter(type(User))
      }
      p(func: uid(p)) {
        id: uid
        expand(_all_)
      }
    } 
  `
    const res = await this.dbService.commitQuery<{p: User[]}>({ query, vars: { $id: id } })

    return res.p
  }
}
