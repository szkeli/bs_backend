import { ForbiddenException, Injectable } from '@nestjs/common'

import { Admin } from '../admin/models/admin.model'
import { SystemErrorException } from '../app.exception'
import { Role } from '../auth/model/auth.model'
import { DbService } from '../db/db.service'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { btoa, now, relayfyArrayForward } from '../tool'
import { AdminAndUserUnion, User } from '../user/models/user.model'
import {
  IPRIVILEGE,
  Privilege,
  PrivilegesConnection
} from './models/privileges.model'

@Injectable()
export class PrivilegesService {
  constructor (private readonly dbService: DbService) {}

  async removePrivilegeOnUser (id: string, from: string, privilege: IPRIVILEGE) {
    const query = `
      query v($adminId: string, $xid: string, $privilege: string) {
        # 管理员存在
        v(func: uid($adminId)) @filter(type(Admin)) { v as uid }
        # 管理员已认证
        u(func: uid($adminId)) @filter(type(Admin) and has(credential)) { u as uid }
        # 用户存在
        x(func: uid($xid)) @filter(type(User)) { x as uid }
        y(func: uid($xid)) @filter(type(User)) {
          privileges @filter(type(Privilege) and eq(value, $privilege)) {
            # 用户确实具有该权限
            y as uid
            # 该权限的创建者
            creator as creator @filter(type(Admin))
          }
        }
      }
    `
    const condition =
      '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 1) and eq(len(y), 1) )'
    const mutation = {
      uid: 'uid(y)',
      'dgraph.type': 'Privilege',
      creator: {
        uid: 'uid(creator)'
      },
      to: {
        uid: from,
        privileges: {
          uid: 'uid(y)'
        }
      }
    }
    const res = await this.dbService.commitConditionalDeletions<
    Map<string, string>,
    {
      v: Array<{ uid: string }>
      u: Array<{ uid: string }>
      x: Array<{ uid: string }>
      y: Array<{ uid: string }>
    }
    >({
      mutations: [{ mutation, condition }],
      query,
      vars: {
        $adminId: id,
        $xid: from,
        $privilege: privilege
      }
    })

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`管理员 ${id} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`管理员 ${id} 未认证`)
    }
    if (res.json.x.length !== 1) {
      throw new ForbiddenException(`用户 ${from} 不存在`)
    }
    if (res.json.y.length !== 1) {
      throw new ForbiddenException(`用户 ${from} 没有 ${privilege} 权限`)
    }

    return true
  }

  async privileges ({
    first,
    after,
    orderBy
  }: RelayPagingConfigArgs): Promise<PrivilegesConnection> {
    after = btoa(after)
    if (first && orderBy) {
      return await this.privilegesWithRelayForward(first, after)
    }
    throw new Error('Method not implemented.')
  }

  async privilegesWithRelayForward (
    first: number,
    after: string | null
  ): Promise<PrivilegesConnection> {
    const q1 =
      'var(func: uid(privileges), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($after: string) {
        var(func: type(Privilege), orderdesc: createdAt) { privileges as uid }

        ${after ? q1 : ''}
        totalCount (func: uid(privileges)) { count(uid) }
        objs(func: uid(${
          after ? 'q' : 'privileges'
        }), orderdesc: createdAt, first: ${first}) {
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
      totalCount: Array<{ count: number }>
      startO: Array<{ createdAt: string }>
      endO: Array<{ createdAt: string }>
      objs: Privilege[]
    }>({ query, vars: { $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async addPrivilegeOnUser (
    adminId: string,
    privilege: IPRIVILEGE,
    to: string
  ): Promise<Privilege> {
    const query = `
      query v($adminId: string, $privilege: string, $to: string) {
        v(func: uid($adminId)) @filter(type(Admin)) { v as uid }
        # 授权的管理员以认证
        q(func: uid($adminId)) @filter(type(Admin) and has(credential)) { q as uid }
        u(func: uid($to)) @filter(type(User)) { u as uid }
        # 被授权用户没有该权限
        x(func: uid($to)) @filter(type(User)) {
          privileges @filter(type(Privilege) and eq(value, $privilege)) {
            x as uid
          }
        }
      }
    `

    const _now = now()
    const condition =
      '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 0) and eq(len(q), 1) )'
    const mutation = {
      uid: '_:privilege',
      'dgraph.type': 'Privilege',
      createdAt: _now,
      value: privilege,
      to: {
        uid: to,
        privileges: {
          uid: '_:privilege'
        }
      },
      creator: {
        uid: adminId
      }
    }

    const res = await this.dbService.commitConditionalUperts<
    Map<string, string>,
    {
      v: Array<{ uid: string }>
      q: Array<{ uid: string }>
      u: Array<{ uid: string }>
      x: Array<{ uid: string }>
    }
    >({
      mutations: [{ mutation, condition }],
      query,
      vars: {
        $adminId: adminId,
        $privilege: privilege,
        $to: to
      }
    })

    if (res.json.q.length !== 1) {
      throw new ForbiddenException(`管理员 ${adminId} 没有认证`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`用户 ${to} 不存在`)
    }

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`管理员 ${adminId} 不存在`)
    }
    if (res.json.x.length !== 0) {
      throw new ForbiddenException(`用户 ${to} 已拥有 ${privilege} 权限`)
    }

    const _id = res.uids.get('privilege')

    if (!_id) throw new SystemErrorException()

    return {
      id: _id,
      createdAt: _now,
      value: privilege
    }
  }

  async removePrivilegeOnAdmin (
    adminId: string,
    from: string,
    privilege: IPRIVILEGE
  ) {
    if (adminId === from) {
      throw new ForbiddenException('不能对自己操作')
    }
    const query = `
      query v($from: string, $adminId: string, $privilege: string) {
        # 管理员存在
        v(func: uid($adminId)) @filter(type(Admin)) { v as uid }
        # from 是管理员
        u(func: uid($from)) @filter(type(Admin)) { u as uid }
        x(func: uid($from)) @filter(type(Admin)) {
          privileges @filter(type(Privilege) and eq(value, $privilege)) {
            x as uid
            creator as creator @filter(type(Admin))
          }
        }
      }
    `
    const condition =
      '@if( eq(len(v), 1) and eq(len(x), 1) and eq(len(u), 1) )'
    const mutation = {
      uid: 'uid(x)',
      'dgraph.type': 'Privilege',
      creator: {
        uid: 'uid(creator)'
      },
      // 清除被授权人员的权限
      to: {
        uid: from,
        privileges: {
          uid: 'uid(x)'
        }
      }
    }
    const res = await this.dbService.commitConditionalDeletions<
    Map<string, string>,
    {
      v: Array<{ uid: string }>
      x: Array<{}>
      u: Array<{}>
    }
    >({
      mutations: [{ mutation, condition }],
      query,
      vars: {
        $adminId: adminId,
        $from: from,
        $privilege: privilege
      }
    })
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`管理员 ${from} 不存在`)
    }
    if (res.json.x.length !== 1) {
      throw new ForbiddenException(`管理员 ${from} 没有 ${privilege} 权限`)
    }
    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`管理员 ${from} 不存在`)
    }
    return res.json.x.length === 1
  }

  async addPrivilegeOnAdmin (
    id: string,
    privilege: IPRIVILEGE,
    to: string
  ): Promise<Privilege> {
    if (id === to) {
      throw new ForbiddenException(`不能对自己授权 ${privilege}`)
    }
    const query = `
      query v($adminId: string, $to: string, $privilege: string) {
        # 授权者存在
        v(func: uid($adminId)) @filter(type(Admin)) { v as uid }
        # 被授权者存在
        u(func: uid($to)) @filter(type(Admin)) { 
          u as uid
        }
        # 被授权者已经认证
        x(func: uid($to)) @filter(type(Admin)) {
          credential @filter(type(Credential)) {
            x as uid
          }
        }
        # 被授权者未拥有该权限
        y(func: uid($to)) @filter(type(Admin)) {
          privileges @filter(type(Privilege) AND eq(value, $privilege)) { y as uid }
        }
      }
    `
    const condition =
      '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 1) AND eq(len(y), 0) )'
    const mutation = {
      uid: '_:privilege',
      'dgraph.type': 'Privilege',
      createdAt: now(),
      value: privilege,
      to: {
        uid: to,
        privileges: {
          uid: '_:privilege'
        }
      },
      creator: {
        uid: id
      }
    }

    const res = await this.dbService.commitConditionalUperts<
    Map<string, string>,
    {
      v: Array<{ uid: string }>
      u: Array<{ uid: string, count: number }>
      x: Array<{ credential: { uid: string } }>
      y: Array<{}>
    }
    >({
      mutations: [{ mutation, condition }],
      vars: {
        $adminId: id,
        $to: to,
        $privilege: privilege
      },
      query
    })

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`授权者 ${id} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`管理员 ${to} 不存在`)
    }
    if (
      !res.json.x ||
      res.json.x.length !== 1 ||
      !res.json.x[0].credential ||
      !res.json.x[0].credential.uid
    ) {
      throw new ForbiddenException(`管理员 ${to} 未认证`)
    }
    if (res.json.y.length !== 0) {
      throw new ForbiddenException(`管理员 ${to} 已拥有 ${privilege} 权限`)
    }

    const _id = res.uids.get('privilege')
    if (!_id) throw new SystemErrorException()

    return {
      id: _id,
      createdAt: now(),
      value: privilege
    }
  }

  async to (id: string) {
    const query = `
      query v($uid: string) {
        privilege(func: uid($uid)) @filter(type(Privilege)) {
          to @filter(type(User) OR type(Admin)) {
            id: uid
            expand(_all_)
            dgraph.type
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      privilege: Array<{
        to: typeof AdminAndUserUnion & { 'dgraph.type': Role[] }
      }>
    }>({ query, vars: { $uid: id } })
    if (res.privilege[0].to['dgraph.type'].includes(Role.Admin)) {
      return new Admin(res.privilege[0].to)
    }
    if (res.privilege[0].to['dgraph.type'].includes(Role.User)) {
      return new User(res.privilege[0].to as unknown as User)
    }
  }

  async privilege (id: string) {
    const query = `
      query v($privilegeId: string) {
        privilege(func: uid($privilegeId)) @filter(type(Privilege)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{ privilege: Privilege[] }>({
      query,
      vars: { $privilegeId: id }
    })
    if (res.privilege.length !== 1 || !res.privilege[0]) {
      throw new ForbiddenException(`权限 ${id} 不存在`)
    }
    return res.privilege[0]
  }
}
