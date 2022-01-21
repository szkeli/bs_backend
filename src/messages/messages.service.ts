import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient, Mutation, Request } from 'dgraph-js'

import { MessageItem, MessageItemConnection, ParticipantsConnection } from '../conversations/models/conversations.model'
import { DbService } from '../db/db.service'
import { Report } from '../reports/models/reports.model'
import { User } from '../user/models/user.model'
import { Message } from './models/messages.model'

@Injectable()
export class MessagesService {
  async to (id: string) {
    const query = `
      query v($messageId: string) {
        message(func: uid($messageId)) @filter(type(Message)) {
          to @filter(type(User) OR type(Conversation)) {
            id: uid
            expand(_all_)
            dgraph.type
          }
        } 
      }
    `
    const res = await this.dbService.commitQuery({ query, vars: { $messageId: id } })
    console.error(res)
  }

  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async addMessageOnConversation (id: string, conversationId: string, content: string) {
    const txn = this.dgraph.newTxn()
    try {
      const now = new Date().toISOString()
      const conditions = '@if( eq(len(v), 1) AND eq(len(u), 1) AND ( eq(len(n), 1) OR eq(len(m), 1) ) )'
      // todo: 发送消息的 id 在Conversation里
      const query = `
        query v($uid: string, $conversationId: string) {
          # 用户是否存在
          q(func: uid($uid)) @filter(type(User)) { v as uid }
          # 会话是否存在
          p(func: uid($conversationId)) @filter(type(Conversation)) { 
            u as uid
          }
          # 发送消息的用户是会话创建者
          x(func: uid($conversationId)) @filter(uid_in(creator, $uid) AND type(Conversation)) {
            n as uid
          }
          # 发送消息的用户是会话参与者
          y(func: uid($conversationId)) @filter(uid_in(participants, $uid) AND type(Conversation)) {
            m as uid
          }
        }
      `
      const mutation = {
        uid: conversationId,
        messages: {
          uid: '_:message',
          'dgraph.type': 'Message',
          creator: {
            uid: id
          },
          createdAt: now,
          content
        }
      }

      const mu = new Mutation()
      mu.setSetJson(mutation)
      mu.setCond(conditions)

      const req = new Request()
      const vars = req.getVarsMap()
      vars.set('$uid', id)
      vars.set('$conversationId', conversationId)
      req.setQuery(query)
      req.addMutations(mu)
      req.setCommitNow(true)

      const res = await txn.doRequest(req)
      const json = res.getJson() as unknown as {
        q: Array<{uid: string}>
        p: Array<{uid: string}>
        x: Array<{uid: string}>
        y: Array<{uid: string}>
      }
      if (!json.q || json.q.length !== 1) {
        throw new ForbiddenException(`用户 ${id} 不存在`)
      }
      if (!json.p || json.p.length !== 1) {
        throw new ForbiddenException(`会话 ${conversationId} 不存在`)
      }
      if ((!json.x || json.x.length !== 1) && (!json.y || json.y.length !== 1)) {
        throw new ForbiddenException(`用户 ${id} 不在会话 ${conversationId} 内`)
      }
      const messageId = res.getUidsMap().get('message') as unknown as string
      const message: Message = {
        id: messageId,
        content,
        createdAt: now
      }
      return message
    } finally {
      await txn.discard()
    }
  }

  async findParticipantsByConversationId (id: string, first: number, offset: number) {
    const query = `
      query v($uid: string) {
        totalCount(func: uid($uid)) @filter(type(Conversation)) {
          count: count(participants)
        }
        conversation(func: uid($uid)) @filter(type(Conversation)) {
          participants(orderdesc: createdAt, first: ${first}, offset: ${offset}) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $uid: id }))
      .getJson() as unknown as {
      totalCount: Array<{count: number}>
      conversation: Array<{participants: User[]}>
    }

    const u: ParticipantsConnection = {
      nodes: res.conversation[0]?.participants || [],
      totalCount: res.totalCount[0].count
    }
    return u
  }

  async findMessagesByConversationId (id: string, first: number, offset: number): Promise<MessageItemConnection> {
    const query = `
      query v($uid: string) {
        totalCount(func: uid($uid)) @filter(type(Conversation)) {
          count: count(messages)
        }
        conversation(func: uid($uid)) @filter(type(Conversation)) {
          messages(orderdesc: createdAt, first: ${first}, offset: ${offset}) {
            id: uid
            expand(_all_)
            dgraph.type
          }
        }
      }
    `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $uid: id }))
      .getJson() as unknown as {
      totalCount: Array<{count: number}>
      conversation: Array<{messages: Array<(typeof MessageItem & { 'dgraph.type': string })>}>
    }

    const messages = res.conversation[0]?.messages?.map(m => {
      if (m['dgraph.type'].includes('Message')) {
        return new Message(m as unknown as Message)
      }
      if (m['dgraph.type'].includes('Report')) {
        return new Report(m as unknown as Report)
      }
      return new Message(m as unknown as Message)
    })

    return {
      nodes: messages || [],
      totalCount: res.totalCount[0].count
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
