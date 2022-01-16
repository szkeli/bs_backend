import { ForbiddenException, Injectable } from '@nestjs/common'
import { ForbiddenError } from 'apollo-server-express'
import { DgraphClient, Mutation, Request } from 'dgraph-js'

import { DbService } from '../db/db.service'
import { Conversation, CONVERSATION_STATE } from './models/conversations.model'

@Injectable()
export class ConversationsService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async createConversation (creator: string, title: string, description: string, participants: string[]) {
    const txn = this.dgraph.newTxn()
    try {
      const now = new Date().toISOString()
      const participantsLength = participants.length
      const participantsString = `[${participants.toString()}]`
      console.error({ participants, participantsLength, participantsString })
      const conditions = `@if( eq(len(v), 1) AND eq(len(u), ${participantsLength}) )`
      const query = `
        query v($participants: string){
          v(func: uid(${creator})) @filter(type(User)) { v as uid }
          u(func: uid($participants)) @filter(type(User)) { u as uid }
        }
      `

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
        participants: {
          uid: creator,
          conversations: {
            uid: '_:conversation'
          }
        }
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
      // ?      { json: { v: [ [Object] ], u: [ [Object], [Object] ] }, v: undefined }

      console.error({
        json: json.u,
        v
      })
      if (!v) {
        if (json.v.length !== 1) {
          throw new ForbiddenException(`用户 ${creator} 不存在`)
        }
        if (json.u.length !== participantsLength) {
          throw new ForbiddenException(`只存在 ${(json.u.map(x => x.uid)).toString()} 用户`)
        }
        throw new ForbiddenException('会话创建失败，位置错误')
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

  async conversation (id: string) {
    throw new Error('Method not implemented.')
  }
}
