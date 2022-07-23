import { NotImplementedException } from '@nestjs/common'
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { handleRelayForwardAfter, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { University } from '../universities/models/universities.models'
import { Institute, InstitutesConnection } from './models/institutes.model'

@Resolver(of => University)
export class UniversityResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => InstitutesConnection, { description: '该大学的所有学院' })
  async institutes (@Parent() university: University, @Args() args: RelayPagingConfigArgs) {
    const { id } = university
    let { first, after, orderBy } = args
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.institutesRelayForward(id, first, after)
    }
    throw new NotImplementedException()
  }

  async institutesRelayForward (id: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(institutes), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($id: string, $after: string) {
            var(func: uid($id)) @filter(type(University)) {
                institutes as institutes @filter(type(Institute))
            }
            ${after ? q1 : ''}
            totalCount(func: uid(institutes)) { count(uid) }
            objs(func: uid(${after ? 'q' : 'institutes'}), orderdesc: createdAt, first: ${first}) {
                id: uid
                expand(_all_)
            }
            startO(func: uid(institutes), first: -1) { createdAt }
            endO(func: uid(institutes), first: 1) { createdAt }
        }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Institute>>({
      query,
      vars: { $id: id, $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }
}
