import { NotImplementedException } from '@nestjs/common'
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { NotNull, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { Person, User } from '../user/models/user.model'
import { Conversation, ConversationsConnection } from './models/conversations.model'

@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => ConversationsConnection, { description: '当前用户创建的所有会话' })
  async conversations (@Parent() user: User, @Args() args: RelayPagingConfigArgs) {
    const { first, after, orderBy } = args
    if (NotNull(first) && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.conversationsRelayFarword(user, first, after)
    }
    throw new NotImplementedException()
  }

  async conversationsRelayFarword (user: User, first: number | null, after: string | null): Promise<ConversationsConnection> {
    const q1 = 'var(func: uid(conversations), orderdesc: createdAt) @filter(lt(createdAt, #after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(User)) {
          conversations as conversations(orderdesc: createdAt) @filter(type(Conversation))
        }
        ${after ? q1 : ''}
        totalCount(func: uid(conversations)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'conversations'}), orderdesc: createdAt, first: ${first ?? 0}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(conversations), first: -1) { createdAt }
        endO(func: uid(conversations), first: 1) { createdAt }
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Conversation>>({ query, vars: { $id: user.id, $after: after } })
    return relayfyArrayForward({
      ...res,
      first: first ?? 0,
      after
    })
  }
}
