import { NotImplementedException } from '@nestjs/common'
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { relayfyArrayForward } from '../tool'
import { Delete, DeletesConnection } from './models/deletes.model'

@Resolver(of => Admin)
export class AdminResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => DeletesConnection, { description: '当前管理员的所有删除操作' })
  async deletes (@Parent() admin: Admin, @Args() args: RelayPagingConfigArgs) {
    const { id } = admin
    const { first, after, orderBy } = args
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.deletesWithRelayForward(id, first, after)
    }
    throw new NotImplementedException()
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
}
