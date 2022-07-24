import { NotImplementedException } from '@nestjs/common'
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { Role } from '../roles/models/roles.model'
import { handleRelayForwardAfter, relayfyArrayForward } from '../tool'
import { User, UsersConnectionWithRelay } from './models/user.model'

@Resolver(of => Role)
export class RoleResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => UsersConnectionWithRelay, { description: '具有该角色的所有用户' })
  async users (@Parent() role: Role, @Args() args: RelayPagingConfigArgs) {
    const { id } = role
    let { first, after, orderBy } = args
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.usersWithRelayForward(id, first, after)
    }
    throw new NotImplementedException()
  }

  @ResolveField(of => Admin, { description: '角色的创建者' })
  async creator (@Parent() role: Role) {
    const { id } = role
    const query = `
    query v($id: string) {
      var(func: uid($id)) @filter(type(Role)) {
        creator as creator @filter(type(Admin))
      }
      creator(func: uid(creator)) {
        id: uid
        expand(_all_)
      }
    }
  `
    const res = await this.dbService.commitQuery<{creator: Admin[]}>({ query, vars: { $id: id } })

    return res.creator[0]
  }

  async usersWithRelayForward (id: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(users), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(Role)) {
          users as users @filter(type(User))
        }
        ${after ? q1 : ''}
        totalCount(func: uid(users)) { count(uid) }
        users(func: uid(${after ? 'q' : 'users'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startUser(func: uid(users), first: -1) {
          createdAt
        }
        # 结束游标
        endUser(func: uid(users), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      users: User[]
      startUser: Array<{createdAt: string}>
      endUser: Array<{createdAt: string}>
    }>({ query, vars: { $id: id, $after: after } })

    return relayfyArrayForward({
      totalCount: res.totalCount,
      startO: res.startUser,
      endO: res.endUser,
      objs: res.users,
      first,
      after
    })
  }
}
