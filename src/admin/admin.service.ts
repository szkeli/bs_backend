import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient, Mutation, Request } from 'dgraph-js'

import { ICredential, ICredentialsConnection } from '../credentials/models/credentials.model'
import { DbService } from '../db/db.service'
import { Privilege, PrivilegesConnection } from '../privileges/models/privileges.model'
import {
  Admin,
  AdminsConnection,
  RegisterAdminArgs
} from './models/admin.model'

@Injectable()
export class AdminService {
  async privileges (adminId: string, first: number, offset: number): Promise<PrivilegesConnection> {
    const query = `
      query v($adminId: string) {
        to(func: uid($adminId)) @filter(type(Admin)) {
          privileges @filter(type(Privilege)) {
            count(uid)
          }
        }
        admin(func: uid($adminId)) @filter(type(Admin)) {
          privileges (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Privilege)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{to: Array<{privileges: Array<{count: number}>}>, admin: Array<{privileges: Privilege[]}>}>({ query, vars: { $adminId: adminId } })
    return {
      nodes: res.admin[0]?.privileges ?? [],
      totalCount: res?.to[0]?.privileges[0]?.count ?? 0
    }
  }

  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async findCredentialsByAdminId (id: string, first: number, offset: number): Promise<ICredentialsConnection> {
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
      admin: Array<{credentials: ICredential[], count: number}>
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
  async authenAdmin (i: string, to: string): Promise<ICredential> {
    if (i === to) {
      throw new ForbiddenException('不能对自己授权')
    }
    const now = new Date().toISOString()

    // 1. 当前认证的管理员存在
    // 2. 当前管理员已被认证
    // 3. 被认证的管理员存在
    // 4. 被认证的管理员未被认证
    const condition1 = '@if( eq(len(x), 0) and eq(len(v), 1) and eq(len(u), 1) and eq(len(q), 1) )'

    // 当前授权者是system
    const condition2 = '@if( eq(len(x), 0) and eq(len(v), 1) and eq(len(u), 1) and eq(len(s), 1) )'
    const query = `
        query v($i: string, $to: string) {
          # 授权者存在
          v(func: uid($i)) @filter(type(Admin)) { v as uid }
          # 被授权者存在
          u(func: uid($to)) @filter(type(Admin)) { u as uid }
          # 授权者是system
          s(func: uid($i)) @filter(type(Admin) and eq(userId, "system") and uid($i)) { s as uid }
          # 被授权者的授权
          x(func: uid($to)) @filter(type(Admin)) { 
            credential @filter(type(Credential)) {
              x as uid
            }
          }
          # 授权者的授权
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
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      s: Array<{uid: string}>
      x: Array<{credential: {uid: string}}>
      q: Array<{credential: {uid: string}}>
    }>({
      mutations: [
        { mutation, condition: condition1 },
        { mutation, condition: condition2 }
      ],
      query,
      vars: {
        $i: i,
        $to: to
      }
    })

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`授权者 ${i} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`管理员 ${to} 不存在`)
    }
    if (res.json.x.length !== 0) {
      throw new ForbiddenException(`管理员 ${to} 已被认证`)
    }
    if (res.json.q.length === 0 && res.json.s.length === 0) {
      throw new ForbiddenException(`授权者 ${i} 未认证`)
    }

    return {
      createdAt: now,
      id: res.uids.get('credential')
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

    const res = await this.dbService.commitQuery<{
      admin: Admin[]
    }>({
      query,
      vars: {
        $uid: id
      }
    })

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
    const res = await this.dbService.commitQuery<{
      admin: Admin[]
      totalCount: Array<{count: number}>
    }>({ query })

    return {
      nodes: res.admin || [],
      totalCount: res.totalCount[0].count
    }
  }

  async registerAdmin (args: RegisterAdminArgs): Promise<Admin> {
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

      return {
        id: uid,
        userId: args.userId,
        name: args.name,
        avatarImageUrl: args.avatarImageUrl,
        createdAt: now,
        updatedAt: now,
        lastLoginedAt: now
      }
    } finally {
      await txn.discard()
    }
  }
}
