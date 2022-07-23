import { NotImplementedException } from '@nestjs/common'
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { handleRelayForwardAfter, relayfyArrayForward } from '../tool'
import { Fold, FoldsConnection } from './models/folds.model'

@Resolver(of => Admin)
export class AdminResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => FoldsConnection, { description: '当前管理员折叠的评论' })
  async folds (@Parent() admin: Admin, @Args() args: RelayPagingConfigArgs) {
    const { id } = admin
    let { first, after, orderBy } = args
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.foldsWithRelayForward(id, first, after)
    }
    throw new NotImplementedException()
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
}
