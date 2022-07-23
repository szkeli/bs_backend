import { Injectable } from '@nestjs/common'

import { SystemErrorException, UserIdExistException } from '../app.exception'
import { ORDER_BY } from '../connections/models/connections.model'
import { ICredential } from '../credentials/models/credentials.model'
import { DbService } from '../db/db.service'
import { Delete, DeletesConnection } from '../deletes/models/deletes.model'
import { Fold } from '../folds/models/folds.model'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { Privilege, PrivilegesConnection } from '../privileges/models/privileges.model'
import { btoa, handleRelayForwardAfter, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import {
  Admin,
  AdminsConnection,
  RegisterAdminArgs
} from './models/admin.model'

@Injectable()
export class AdminService {
  constructor (private readonly dbService: DbService) {}

  async credentials (id: string, { first, after, orderBy }: RelayPagingConfigArgs) {
    after = btoa(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.credentialsWithRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async credentialsWithRelayForward (id: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(credentials), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(Admin)) {
          credentials as credentials @filter(type(Credential))
        }

        ${after ? q1 : ''}
        totalCount (func: uid(credentials)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'credentials'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(credentials), first: -1) {
          createdAt
        }
        endO(func: uid(credentials), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startO: Array<{createdAt: string}>
      endO: Array<{createdAt: string}>
      objs: ICredential[]
    }>({ query, vars: { $id: id, $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async folds (id: string, { first, after, orderBy }: RelayPagingConfigArgs) {
    after = btoa(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.foldsWithRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async foldsWithRelayForward (id: string, first: number, after: string | null) {
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

  async deletesWithRelayForward (id: string, first: number, after: string | null): Promise<DeletesConnection> {
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

  async privileges (id: string, { first, after, orderBy }: RelayPagingConfigArgs): Promise<PrivilegesConnection> {
    after = btoa(after)
    if (first && orderBy) {
      return await this.privilegesWithRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async privilegesWithRelayForward (id: string, first: number, after: string | null): Promise<PrivilegesConnection> {
    const q1 = 'var(func: uid(privileges), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(Admin)) {
          privileges as privileges @filter(type(Privilege))
        }

        ${after ? q1 : ''}
        totalCount (func: uid(privileges)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'privileges'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(privileges), first: -1) {
          createdAt
        }
        endO(func: uid(privileges), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startO: Array<{createdAt: string}>
      endO: Array<{createdAt: string}>
      objs: Privilege[]
    }>({ query, vars: { $id: id, $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async findCredentialByAdminId (id: string) {
    const query = `
      query v($id: string) {
        var(func: uid($id)) {
          c as credential @filter(type(Credential))
        }
        credential(func: uid(c)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{credential: ICredential[]}>({
      query,
      vars: { $id: id }
    })

    return res.credential[0]
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

  async admins ({ first, after, orderBy }: RelayPagingConfigArgs): Promise<AdminsConnection> {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.adminsRelayForward(first, after)
    }

    throw new Error('Method not implemented.')
  }

  async adminsRelayForward (first: number, after: string | null): Promise<AdminsConnection> {
    const q1 = 'var(func: uid(admins)) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($after: string) {
        admins as var(func: type(Admin), orderdesc: createdAt)
        ${after ? q1 : ''}
        totalCount(func: uid(admins)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'admins'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startO(func: uid(admins), first: -1) { createdAt }
        # 结束游标
        endO(func: uid(admins), first: 1) { createdAt }
      }
    `

    const res = await this.dbService.commitQuery<RelayfyArrayParam<Admin>>({ query, vars: { $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async registerAdmin (args: RegisterAdminArgs): Promise<Admin> {
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
    const res = await this.dbService.commitMutation<Map<string, string>, {
      v: Array<{uid: string}>
    }>({
      query,
      mutations: [{ set: mutation, cond: conditions }],
      vars: { $userId: args.userId }
    })

    if (res.json.v.length !== 0) {
      throw new UserIdExistException(args.userId)
    }
    const uid = res.uids.get('admin')

    if (!uid) throw new SystemErrorException()

    return {
      id: uid,
      userId: args.userId,
      name: args.name,
      avatarImageUrl: args.avatarImageUrl,
      createdAt: now,
      updatedAt: now,
      lastLoginedAt: now
    }
  }
}
