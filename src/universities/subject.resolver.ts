import { NotImplementedException } from '@nestjs/common'
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import {
  ORDER_BY,
  RelayPagingConfigArgs
} from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { Subject } from '../subject/model/subject.model'
import {
  handleRelayForwardAfter,
  relayfyArrayForward,
  RelayfyArrayParam
} from '../tool'
import {
  UniversitiesConnection,
  University
} from './models/universities.models'

@Resolver(of => Subject)
export class SubjectResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => UniversitiesConnection, {
    description: '具有该 Subject 的所有大学'
  })
  async universities (
  @Parent() subject: Subject,
    @Args() args: RelayPagingConfigArgs
  ) {
    const { id } = subject
    let { first, after, orderBy } = args
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.universitiesRelayForward(id, first, after)
    }
    throw new NotImplementedException()
  }

  async universitiesRelayForward (
    id: string,
    first: number,
    after: string | null
  ) {
    const q1 =
      'var(func: uid(universities), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(Subject)) {
          universities as ~subjects @filter(type(University))
        }
        ${after ? q1 : ''}
        totalCount(func: uid(universities)) { count(uid) }
        objs(func: uid(${
          after ? 'q' : 'universities'
        }), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(universities), first: -1) { createdAt }
        endO(func: uid(universities), first: 1) { createdAt }
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<University>>(
      {
        query,
        vars: { $id: id, $after: after }
      }
    )

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }
}
