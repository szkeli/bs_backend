import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient, Mutation, Request } from 'dgraph-js'

import { DbService } from '../db/db.service'
import { Conversation, CONVERSATION_STATE, ConversationsConnection } from './models/conversations.model'

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

  async createConversation (creator: string, title: string, description: string, participants: string[]) {
    const txn = this.dgraph.newTxn()
    try {
      const now = new Date().toISOString()
      const participantsLength = participants.length
      const participantsString = `[${participants.toString()}]`
      const conditions = `@if( eq(len(v), 1) AND eq(len(u), ${participantsLength}) )`
      const query = `
        query v($participants: string){
          v(func: uid(${creator})) @filter(type(User)) { v as uid }
          u(func: uid($participants)) @filter(type(User)) { u as uid }
        }
      `

      participants.push(creator)
      const _participants = participants.map(p => {
        return {
          uid: p,
          conversations: {
            uid: '_:conversation'
          }
        }
      })
      const mutation = {
        uid: '_:conversation',
        'dgraph.type': 'Conversation',
        description,
        title,
        createdAt: now,
        creator: {
          uid: creator,
          conversations: {
            uid: '_:conversation'
          }
        },
        state: CONVERSATION_STATE.RUNNING,
        participants: _participants
      }

      const mu = new Mutation()
      mu.setSetJson(mutation)
      mu.setCond(conditions)

      const req = new Request()
      const vars = req.getVarsMap()
      vars.set('$participants', participantsString)
      req.setQuery(query)
      req.addMutations(mu)
      req.setCommitNow(true)

      const res = await txn.doRequest(req)
      const json = res.getJson() as unknown as {
        v: any[]
        u: Array<{uid: string}>
      }
      const v = res.getUidsMap().get('conversation') as unknown as string

      if (!v) {
        if (json.v.length !== 1) {
          throw new ForbiddenException(`用户 ${creator} 不存在`)
        }
        if (json.u.length !== participantsLength) {
          throw new ForbiddenException(`只存在 ${(json.u.map(x => x.uid)).toString()} 用户`)
        }
        throw new ForbiddenException('会话创建失败，未知错误')
      }
      const c: Conversation = {
        id: v,
        title,
        description,
        createdAt: now,
        state: CONVERSATION_STATE.RUNNING
      }
      return c
    } finally {
      await txn.discard()
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
