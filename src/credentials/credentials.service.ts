import { ForbiddenException, Injectable } from '@nestjs/common'

import { Admin } from '../admin/models/admin.model'
import { DbService } from '../db/db.service'
import { ICredential, ICredentialsConnection } from './models/credentials.model'

@Injectable()
export class CredentialsService {
  constructor (private readonly dbService: DbService) {}

  async authenUser (id: string, to: string) {
    const now = new Date().toISOString()
    const query = `
      query v($adminId: string, $to: string) {
        # 授权的管理员存在
        v(func: uid($adminId)) @filter(type(Admin)) { v as uid }
        # 被授权的用户存在
        u(func: uid($to)) @filter(type(User)) { u as uid }
        # 授权者已认证
        x(func: uid($adminId)) @filter(type(Admin)) {
          credential @filter(type(Credential)) {
            x as uid
          }
        }
        # 被授权者未认证
        y(func: uid($to)) @filter(type(User)) {
          credential @filter(type(Credential)) {
            y as uid
          }
        }
      }
    `
    const condition = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 1) and eq(len(y), 0) )'
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
        uid: id,
        credentials: {
          uid: '_:credential'
        }
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{credential: {uid: string}}>
      y: Array<{credential: {uid: string}}>
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: {
        $adminId: id,
        $to: to
      }
    })

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`管理员 ${id} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`用户 ${to} 不存在`)
    }
    if (res.json.x.length !== 1) {
      throw new ForbiddenException(`管理员 ${id} 未认证`)
    }
    if (res.json.y.length !== 0) {
      throw new ForbiddenException(`用户 ${to} 已认证`)
    }

    return {
      createdAt: now,
      id: res.uids.get('credential')
    }
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

  async creator (id: string) {
    const query = `
        query v($credentialId: string) {
            credential(func: uid($credentialId)) @filter(type(Credential)) {
                creator @filter(type(Admin)) {
                    id: uid
                    expand(_all_)
                }
            }
        }
      `
    const res = await this.dbService.commitQuery<{credential: Array<{creator: Admin}>}>({ query, vars: { $credentialId: id } })
    return res.credential[0]?.creator
  }

  async to (id: string) {
    const query = `
    query v($credentialId: string) {
        credential(func: uid($credentialId)) @filter(type(Credential)) {
            to @filter(type(Admin)) {
                id: uid
                expand(_all_)
            }
        }
    }
  `
    const res = await this.dbService.commitQuery<{credential: Array<{to: Admin}>}>({ query, vars: { $credentialId: id } })
    return res.credential[0]?.to
  }

  async credentials (first: number, offset: number): Promise<ICredentialsConnection> {
    const query = `
        query {
            totalCount(func: type(Credential)) { count(uid) }
            credentials(func: type(Credential), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
                id: uid
                expand(_all_)
            }
        }
      `
    const res = await this.dbService.commitQuery<{
      credentials: ICredential[]
      totalCount: Array<{count: number}>
    }>({ query })
    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.credentials ?? []
    }
  }

  async credential (credentialId: string) {
    const query = `
        query v($credentialId: string) {
            credential(func: uid($credentialId)) @filter(type(Credential)) {
                id: uid
                expand(_all_)
            }
        }
      `
    const res = await this.dbService.commitQuery<{credential: ICredential[]}>({ query, vars: { $credentialId: credentialId } })
    if (res.credential.length !== 1) {
      throw new ForbiddenException(`凭证 ${credentialId} 不存在`)
    }
    return res.credential[0]
  }
}
