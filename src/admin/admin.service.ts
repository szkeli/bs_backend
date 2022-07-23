import { Injectable } from '@nestjs/common'

import { SystemErrorException, UserIdExistException } from '../app.exception'
import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { handleRelayForwardAfter, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import {
  Admin,
  AdminsConnection,
  RegisterAdminArgs
} from './models/admin.model'

@Injectable()
export class AdminService {
  constructor (private readonly dbService: DbService) {}

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
