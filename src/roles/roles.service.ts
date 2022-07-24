import { Injectable } from '@nestjs/common'

import { AdminNotFoundException, RoleNotFoundException, UserAlreadyHasTheRoleException, UserNotFoundException } from '../app.exception'
import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { btoa, now, relayfyArrayForward } from '../tool'
import { User } from '../user/models/user.model'
import { CreateRoleArgs, Role } from './models/roles.model'

@Injectable()
export class RolesService {
  constructor (private readonly dbService: DbService) {}

  async createRole (actor: string, { title }: CreateRoleArgs) {
    const query = `
      query v($actor: string, $title: string) {
        a(func: uid($actor)) @filter(type(Admin)) { a as uid }
      }
    `
    const condition = '@if( eq(len(a), 1) )'
    const mutation = {
      uid: '_:role',
      'dgraph.type': 'Role',
      createdAt: now(),
      title,
      creator: {
        uid: 'uid(a)'
      }
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      a: Array<{uid: string}>
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: { $actor: actor, $title: title }
    })
    if (res.json.a.length !== 1) {
      throw new AdminNotFoundException(actor)
    }

    return {
      id: res.uids.get('role'),
      createdAt: now(),
      title
    }
  }

  async roles ({ first, after, orderBy }: RelayPagingConfigArgs) {
    after = btoa(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.rolesWithRelayForward(first, after)
    }
    throw new Error('Method not implemented.')
  }

  async rolesWithRelayForward (first: number, after: string | null) {
    const q1 = 'var(func: uid(roles), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($after: string) {
        var(func: type(Role), orderdesc: createdAt) {
          roles as uid
        }
        ${after ? q1 : ''}
        totalCount(func: uid(roles)) { count(uid) }
        roles(func: uid(${after ? 'q' : 'roles'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startRole(func: uid(roles), first: -1) {
          createdAt
        }
        # 结束游标
        endRole(func: uid(roles), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      roles: Role[]
      startRole: Array<{createdAt: string}>
      endRole: Array<{createdAt: string}>
    }>({ query, vars: { $after: after } })

    return relayfyArrayForward({
      totalCount: res.totalCount,
      startO: res.startRole,
      endO: res.endRole,
      objs: res.roles,
      first,
      after
    })
  }

  async addRoleOnUser (actor: string, to: string, roleId: string) {
    const query = `
        query v($actor: string, $to: string, $roleId: string) {
            a(func: uid($actor)) @filter(type(Admin)) { a as uid }
            b(func: uid($to)) @filter(type(User)) { b as uid }
            c(func: uid($roleId)) @filter(type(Role)) { c as uid }
            d(func: uid(b)) @filter(uid_in(roles, $to)) { d as uid }
            user(func: uid(b)) {
              id: uid
              expand(_all_)
            }
        }
      `
    const condition = '@if( eq(len(a), 1) and eq(len(b), 1) and eq(len(c), 1) and eq(len(d), 0) )'
    const mutation = {
      uid: to,
      roles: {
        uid: 'uid(c)',
        users: {
          uid: to
        }
      }
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      a: Array<{uid: string}>
      b: Array<{uid: string}>
      c: Array<{uid: string}>
      d: Array<{uid: string}>
      user: User
    }>({
      query,
      mutations: [
        { mutation, condition }
      ],
      vars: { $actor: actor, $to: to, $roleId: roleId }
    })

    if (res.json.a.length !== 1) {
      throw new AdminNotFoundException(actor)
    }
    if (res.json.b.length !== 1) {
      throw new UserNotFoundException(to)
    }
    if (res.json.c.length !== 1) {
      throw new RoleNotFoundException(roleId)
    }
    if (res.json.d.length !== 1) {
      throw new UserAlreadyHasTheRoleException(to, roleId)
    }

    return res.json.user
  }
}
