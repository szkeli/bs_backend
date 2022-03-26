import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient, Mutation, Request } from 'dgraph-js'

import { ORDER_BY } from '../connections/models/connections.model'
import { ICredential, ICredentialsConnection } from '../credentials/models/credentials.model'
import { DbService } from '../db/db.service'
import { Delete, DeletesConnection } from '../deletes/models/deletes.model'
import { Fold } from '../folds/models/folds.model'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { Privilege, PrivilegesConnection } from '../privileges/models/privileges.model'
import { btoa, relayfyArrayForward } from '../tool'
import {
  Admin,
  AdminsConnection,
  RegisterAdminArgs
} from './models/admin.model'

@Injectable()
export class AdminService {
  async folds (id: string, { first, after, orderBy }: RelayPagingConfigArgs) {
    after = btoa(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.foldsWithRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async foldsWithRelayForward (id: string, first: number, after: string) {
    const q1 = 'var(func: uid(folds), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(Admin)) {
          folds as folds @filter(type(Fold))
        }

        ${after ? q1 : ''}
        totalCount (func: uid(folds)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'folds'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(folds), first: -1) {
          createdAt
        }
        endO(func: uid(folds), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startO: Array<{createdAt: string}>
      endO: Array<{createdAt: string}>
      objs: Fold[]
    }>({ query, vars: { $after: after, $id: id } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async deletes (id: string, { first, after, orderBy }: RelayPagingConfigArgs): Promise<DeletesConnection> {
    after = btoa(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.deletesWithRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async deletesWithRelayForward (id: string, first: number, after: string): Promise<DeletesConnection> {
    const q1 = 'var(func: uid(deletes), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(Admin)) {
          deletes as deletes @filter(type(Delete))
        }

        ${after ? q1 : ''}
        totalCount (func: uid(deletes)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'deletes'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(deletes), first: -1) {
          createdAt
        }
        endO(func: uid(deletes), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startO: Array<{createdAt: string}>
      endO: Array<{createdAt: string}>
      objs: Delete[]
    }>({ query, vars: { $after: after, $id: id } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

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
