import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient, Mutation, Request } from 'dgraph-js'

import { DbService } from '../db/db.service'
import { Admin, AdminsConnection, Credential, CredentialsConnection, PRIVILEGE, RegisterAdminArgs } from './models/admin.model'

@Injectable()
export class AdminService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async findCredentialsByAdminId (id: string, first: number, offset: number): Promise<CredentialsConnection> {
    const query = `
      query v($uid: string) {
        admin(func: uid($uid)) @filter(type(Admin)) {
          count: count(credentials)
          credentials (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Credential)) {
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
      admin: Array<{credentials: Credential[], count: number}>
    }
    return {
      nodes: res.admin[0]?.credentials || [],
      totalCount: res.admin[0].count
    }
  }

  async findCredentialByAdminId (id: string) {
    const query = `
      query v($id: string) {
        admin(func: uid($id)) {
          credential {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $id: id }))
      .getJson() as unknown as {
      admin: Array<{credential: Credential}>
    }
    return res.admin[0]?.credential
  }

  /**
   * 授权一个已注册管理员
   * @param i 已授权的管理员
   * @param to 未授权的管理员
   * @returns {Promise<Credential>}
   */
  async authenAdmin (i: string, to: string): Promise<Credential> {
    if (i === to) {
      throw new ForbiddenException('不能对自己授权')
    }
    const txn = this.dgraph.newTxn()
    try {
      const now = new Date().toISOString()
      // 1. 当前认证的管理员存在
      // 2. 当前管理员已被认证
      // 3. 被认证的管理员存在
      // 4. 被认证的管理员未被认证
      const conditions = '@if( eq(len(x), 0) AND eq(len(v), 1) AND eq(len(u), 1) AND eq(len(q), 1) )'
      const query = `
        query v($i: string, $to: string) {
          # 授权者存在
          v(func: uid($i)) @filter(type(Admin)) { v as uid }
          # 被授权者存在
          u(func: uid($to)) @filter(type(Admin)) { u as uid }
          # 被授权者未被授权
          x(func: uid($to)) @filter(type(Admin)) { 
            credential @filter(type(Credential)) {
              x as uid
            }
          }
          # 授权者已被授权
          q(func: uid($i)) @filter(type(Admin)) {
            credential @filter(type(Credential)) {
              q as uid
            }
          }
        }
      `

      const mutation = {
        uid: '_:credential',
        'dgraph.type': 'Credential',
        createdAt: now,
        to: {
          uid: to,
          credential: {
            uid: '_:credential'
          }
        },
        creator: {
          uid: i,
          credentials: {
            uid: '_:credential'
          }
        }
      }
      const mu = new Mutation()
      mu.setSetJson(mutation)
      mu.setCond(conditions)

      const req = new Request()
      const vars = req.getVarsMap()
      vars.set('$i', i)
      vars.set('$to', to)
      req.setQuery(query)
      req.addMutations(mu)
      req.setCommitNow(true)

      const res = await txn.doRequest(req)
      const json = res.getJson() as unknown as {
        v: Array<{uid: string}>
        u: Array<{uid: string}>
        x: Array<{credential: {uid: string}}>
        q: Array<{credential: {uid: string}}>
      }

      const uid = res.getUidsMap().get('credential')

      if (!json.v || json.v.length !== 1) {
        throw new ForbiddenException(`授权者 ${i} 不存在`)
      }
      if (!json.u || json.u.length !== 1) {
        throw new ForbiddenException(`管理员 ${to} 不存在`)
      }
      if (!json.x || json.x.length !== 0) {
        throw new ForbiddenException(`管理员 ${to} 已被认证`)
      }
      if (!json.q || json.q.length === 0) {
        throw new ForbiddenException(`授权者 ${i} 未认证`)
      }
      return {
        createdAt: now,
        id: uid
      }
    } finally {
      await txn.discard()
    }
  }

  async admin (id: string): Promise<Admin> {
    const query = `
      query v($uid: string) {
        admin (func: uid($uid)) @filter(type(Admin)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $uid: id }))
      .getJson() as unknown as {
      admin: Admin[]
    }
    return res.admin[0]
  }

  async admins (first: number, offset: number): Promise<AdminsConnection> {
    const query = `
      {
        totalCount (func: type(Admin)) {
          count(uid)
        }
        admin (func: type(Admin), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .query(query))
      .getJson() as unknown as {
      admin: Admin[]
      totalCount: Array<{count: number}>
    }

    return {
      nodes: res.admin || [],
      totalCount: res.totalCount[0].count
    }
  }

  async registerAdmin (args: RegisterAdminArgs) {
    const txn = this.dgraph.newTxn()
    try {
      const now = new Date().toISOString()
      const conditions = '@if( eq(len(v), 0) )'
      const query = `
        query v($userId: string){
          v(func: eq(userId, $userId)) @filter(type(User) OR type(Admin)) {
            v as uid
          }
        }
      `
      const mutation = {
        uid: '_:admin',
        'dgraph.type': 'Admin',
        userId: args.userId,
        sign: args.sign,
        name: args.name,
        createdAt: now,
        updatedAt: now,
        lastLoginedAt: now,
        avatarImageUrl: args.avatarImageUrl
      }
      const mu = new Mutation()
      mu.setSetJson(mutation)
      mu.setCond(conditions)

      const req = new Request()
      const vars = req.getVarsMap()
      vars.set('$userId', args.userId)
      req.setQuery(query)
      req.addMutations(mu)
      req.setCommitNow(true)

      const res = await txn.doRequest(req)
      const json = res.getJson() as unknown as {
        v: Array<{uid: string}>
      }
      if (!json || !json.v || json.v.length !== 0) {
        throw new ForbiddenException(`userId ${args.userId} 已被使用`)
      }
      const uid = res.getUidsMap().get('admin')

      const u: Admin = {
        id: uid,
        userId: args.userId,
        name: args.name,
        avatarImageUrl: args.avatarImageUrl,
        createdAt: now,
        updatedAt: now,
        lastLoginedAt: now,
        privileges: [PRIVILEGE.ROOT, PRIVILEGE.CAN_CREATE_ADMIN]
      }
      return u
    } finally {
      await txn.discard()
    }
  }
}
