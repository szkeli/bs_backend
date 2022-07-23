import { NotImplementedException } from '@nestjs/common'
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { handleRelayForwardAfter, relayfyArrayForward } from '../tool'
import { User } from '../user/models/user.model'
import { Privilege, PrivilegesConnection } from './models/privileges.model'

@Resolver(of => User)
export class UserResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => PrivilegesConnection, { description: '当前用户具有的权限' })
  async privileges (@Parent() user: User, @Args() args: RelayPagingConfigArgs) {
    let { after, first, orderBy } = args
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.privilegesWithRelayForward(user.id, first, after)
    }

    throw new NotImplementedException()
  }

  async privilegesWithRelayForward (id: string, first: number, after: string | null): Promise<PrivilegesConnection> {
    const q1 = 'var(func: uid(privileges), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(User)) {
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
}
