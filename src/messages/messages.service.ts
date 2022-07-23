import { ForbiddenException, Injectable, NotImplementedException } from '@nestjs/common'

import { SystemErrorException } from '../app.exception'
import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { MessageItemsConnection } from '../conversations/models/conversations.model'
import { DbService } from '../db/db.service'
import { NotNull, now, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { User } from '../user/models/user.model'
import { AddMessageArgs, Message } from './models/messages.model'

@Injectable()
export class MessagesService {
  constructor (private readonly dbService: DbService) {
  }

  async messages (id: string, args: RelayPagingConfigArgs): Promise<MessageItemsConnection> {
    const { first, after, orderBy } = args
    if (NotNull(first) && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.messagesRelayFarword(id, first, after)
    }
    throw new NotImplementedException()
  }

  async messagesRelayFarword (id: string, first: number | null, after: string | null): Promise<MessageItemsConnection> {
    const q1 = 'var(func: uid(messages), orderdesc: createdAt) @filter(lt(createdAt, #after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(Conversation)) {
          messages as messages(orderdesc: createdAt) @filter(type(Message))
        }
        ${after ? q1 : ''}
        totalCount(func: uid(messages)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'messages'}), orderdesc: createdAt, first: ${first ?? 0}) {
          id: uid
          expand(_all_)
          dgraph.type
        }
        startO(func: uid(messages), first: -1) { createdAt }
        endO(func: uid(messages), first: 1) { createdAt }
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Message>>({ query, vars: { $id: id, $after: after } })
    return relayfyArrayForward({
      ...res,
      first: first ?? 0,
      after
    })
  }

  async addMessage (user: User, args: AddMessageArgs): Promise<Message> {
    const { content, conversationId } = args
    const query = `
      query v($id: string, $cId: string) {
        u(func: uid($id)) @filter(type(User)) { u as uid }
        c(func: uid($cId)) @filter(type(Conversation)) { c as uid }
        # 发送消息的 User 是否在指定的 Conversation 中
        in(func: uid(c)) @filter(uid_in(participants, uid(u))) { in as uid } 
      }
    `
    const condition = '@if( eq(len(u), 1) and eq(len(c), 1) and eq(len(in), 1) )'
    const mutation = {
      uid: 'uid(c)',
      messages: {
        uid: '_:message',
        'dgraph.type': 'Message',
        creator: {
          uid: 'uid(u)'
        },
        createdAt: now(),
        content
      }
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      u: Array<{uid: string}>
      c: Array<{uid: string}>
      in: Array<{uid: string}>
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: { $id: user.id, $cId: conversationId }
    })

    const _id = res.uids.get('message')
    if (!_id) {
      throw new SystemErrorException()
    }
    return {
      id: _id,
      createdAt: now(),
      content
    }
  }

  async message (id: string): Promise<Message> {
    const query = `
      query v($messageId: string) {
        message(func: uid($messageId)) @filter(type(Message)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{message: Message[]}>({
      query,
      vars: { $messageId: id }
    })

    if (res.message.length !== 1) {
      throw new ForbiddenException(`消息 ${id} 不存在`)
    }
    return res.message[0]
  }
}
