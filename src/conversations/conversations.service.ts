import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient } from 'dgraph-js'

import { ParticipantsNotAllExistException, SystemErrorException, UserNotFoundException } from '../app.exception'
import { DbService } from '../db/db.service'
import { ids2String, now } from '../tool'
import { Conversation, CONVERSATION_STATE, ConversationsConnection, CreateConversationArgs } from './models/conversations.model'

@Injectable()
export class ConversationsService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async closeConversation (creator: string, conversationId: string) {
    const query = `
      query v($creator: string, $conversationId: string, $runningState: string) {
        # 当前用户存在
        v(func: uid($creator)) @filter(type(User)) { v as uid }
        # 当前会话存在
        u(func: uid($conversationId)) @filter(type(Conversation)) { 
          id: u as uid
          expand(_all_)
        }
        # 当前会话创建人是当前用户
        x(func: uid($conversationId)) @filter(type(Conversation) and uid_in(creator, $creator)) { x as uid }
        # 当前会话处于open状态
        g(func: uid($conversationId)) @filter(type(Conversation) and eq(state, $runningState)) { g as uid }
      }
    `
    const condition = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 1) and(len(g), 1) )'
    const mutation = {
      uid: 'uid(u)',
      state: CONVERSATION_STATE.CLOSE
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Conversation[]
      x: Array<{uid: string}>
      g: Array<{uid: string}>
    }>({
      mutations: [{ mutation, condition }],
      query,
      vars: {
        $creator: creator,
        $conversationId: conversationId,
        $openState: CONVERSATION_STATE.RUNNING
      }
    })
    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`用户 ${creator} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`会话 ${conversationId} 不存在`)
    }
    if (res.json.x.length !== 1) {
      throw new ForbiddenException(`用户 ${creator} 不是会话 ${conversationId} 的创建者`)
    }
    if (res.json.g.length !== 1) {
      throw new ForbiddenException(`会话 ${conversationId} 不处于 ${CONVERSATION_STATE.RUNNING} 状态`)
    }
    Object.assign(res.json.u[0], { state: CONVERSATION_STATE.CLOSE })
    return res.json.u[0]
  }

  // TODO: 私聊时对于同一个用户使用同一个会话
  async createConversation (id: string, args: CreateConversationArgs): Promise<Conversation> {
    const { participants, title, description } = args
    // Conversation 的创建者也是 Conversation 的参与者
    participants.push(id)
    if (participants.length < 2) {
      throw new SystemErrorException('The length of participants should not less than 2')
    }
    const participantStr = ids2String(participants)
    // 预先处理 Conversation 的 participants
    const _pa = participants.map(p => (
      {
        uid: p,
        conversations: {
          uid: '_:conversation'
        }
      }
    ))

    const query = `
      query v($id: string) {
        u(func: uid($id)) @filter(type(User)) { u as uid }
        p(func: uid(${participantStr})) @filter(type(User)) { p as uid }
      }
    `

    const condition = `@if( eq(len(u), 1) and eq(len(p), ${participants.length}) )`
    const mutation = {
      uid: '_:conversation',
      'dgraph.type': 'Conversation',
      description,
      title,
      createdAt: now(),
      state: CONVERSATION_STATE.RUNNING,
      participants: _pa,
      creator: {
        uid: 'uid(u)',
        conversations: {
          uid: '_:conversation'
        }
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      u: Array<{uid: string}>
      p: Array<{uid: string}>
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: { $id: id }
    })

    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (res.json.p.length !== participants.length) {
      throw new ParticipantsNotAllExistException(participants)
    }

    const _id = res.uids.get('conversation')
    if (!_id) {
      throw new SystemErrorException()
    }

    return {
      id: _id,
      title,
      description,
      state: CONVERSATION_STATE.RUNNING,
      createdAt: now()
    }
  }

  async conversations (first: number, offset: number): Promise<ConversationsConnection> {
    const query = `
      query {
        totalCount(func: type(Conversation)) { count: count(uid) }
        conversations(func: type(Conversation), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{conversations: Conversation[], totalCount: Array<{count: number}>}>({ query })
    return {
      nodes: res.conversations || [],
      totalCount: res.totalCount[0].count
    }
  }

  async conversation (id: string) {
    const query = `
      query v($uid: string) {
        conversation(func: uid($uid)) @filter(type(Conversation)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $uid: id }))
      .getJson() as unknown as {
      conversation: Conversation[]
    }
    if (!res || !res.conversation || res.conversation.length !== 1) {
      throw new ForbiddenException(`会话 ${id} 不存在`)
    }
    return res.conversation[0]
  }

  async findConversationsByUid (id: string, first: number, offset: number) {
    const query = `
      query v($uid: string) {
        totalCount(func: uid($uid)) @filter(type(User)) {
          count: count(conversations)
        }
        user(func: uid($uid)) @filter(type(User)) {
          conversations (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Conversation)) {
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
      user: Array<{conversations: Conversation[]}>
      totalCount: Array<{count: number}>
    }
    const u: ConversationsConnection = {
      totalCount: res.totalCount[0].count,
      nodes: res.user[0]?.conversations || []
    }
    return u
  }
}
