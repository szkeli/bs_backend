import { ForbiddenException, Injectable } from '@nestjs/common'

import { Admin } from '../admin/models/admin.model'
import { Role } from '../auth/model/auth.model'
import { DbService } from '../db/db.service'
import { now } from '../tool'
import { AdminAndUserUnion, User } from '../user/models/user.model'
import { IPRIVILEGE, Privilege } from './models/privileges.model'

@Injectable()
export class PrivilegesService {
  constructor (private readonly dbService: DbService) {}

  async removePrivilegeOnAdmin (adminId: string, from: string, privilege: IPRIVILEGE) {
    if (adminId === from) {
      throw new ForbiddenException('不能对自己操作')
    }
    const query = `
      query v($adminId: string, $privilege: string) {
        v(func: uid($adminId)) @filter(type(Admin)) { v as uid }
        x(func: uid($adminId)) @filter(type(Admin)) {
          privileges @filter(type(Privilege) and eq(value, $privilege)) {
            x as uid
            creator @filter(type(Admin)) {
              creator as uid
            }
          }
        }
      }
    `
    const condition = '@if( eq(len(v), 1) and eq(len(x), 1) )'
    const mutation = {
      uid: 'uid(x)',
      'dgraph.type': 'Privilege',
      creator: {
        uid: 'uid(creator)'
      },
      // 清除被授权人员的权限
      to: {
        uid: 'uid(v)',
        privileges: {
          uid: 'uid(x)'
        }
      }
    }
    const res = await this.dbService.commitConditionalDeletions<Map<string, string>, {
      v: Array<{uid: string}>
      x: Array<{}>
    }>({
      mutations: [{ mutation, condition }],
      query,
      vars: {
        $adminId: from,
        $privilege: privilege
      }
    })
    if (res.json.x.length !== 1) {
      throw new ForbiddenException(`管理员 ${from} 没有 ${privilege} 权限`)
    }
    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`管理员 ${from} 不存在`)
    }
    return res.json.x.length === 1
  }

  async addPrivilegeOnAdmin (id: string, privilege: IPRIVILEGE, to: string): Promise<Privilege> {
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
    const condition = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 1) AND eq(len(y), 0) )'
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

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string, count: number}>
      x: Array<{credential: {uid: string}}>
      y: Array<{}>
    }>({
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
    if (!res.json.x || res.json.x.length !== 1 || !res.json.x[0].credential || !res.json.x[0].credential.uid) {
      throw new ForbiddenException(`管理员 ${to} 未认证`)
    }
    if (res.json.y.length !== 0) {
      throw new ForbiddenException(`管理员 ${to} 已拥有 ${privilege} 权限`)
    }
    return {
      id: res.uids.get('privilege'),
      createdAt: now(),
      value: privilege
    }
  }

  async creator (id: string) {
    const query = `
      query v($uid: string) {
        privilege(func: uid($uid)) @filter(type(Privilege)) {
          creator @filter(type(Admin)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{privilege: Array<{creator: Admin}>}>({ query, vars: { $uid: id } })
    return res.privilege[0].creator
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
    const res = await this.dbService.commitQuery<{privilege: Array<{to: (typeof AdminAndUserUnion) & { 'dgraph.type': Role[]}}>}>({ query, vars: { $uid: id } })
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
    const res = await this.dbService.commitQuery<{privilege: Privilege[]}>({ query, vars: { $privilegeId: id } })
    if (res.privilege.length !== 1 || !res.privilege[0]) {
      throw new ForbiddenException(`权限 ${id} 不存在`)
    }
    return res.privilege[0]
  }
}
