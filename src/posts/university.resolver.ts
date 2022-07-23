import { NotImplementedException } from '@nestjs/common'
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { ORDER_BY } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { handleRelayForwardAfter, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { University } from '../universities/models/universities.models'
import { Post, PostsConnectionWithRelay, RelayPagingConfigArgs } from './models/post.model'

@Resolver(of => University)
export class UniversityResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => PostsConnectionWithRelay, { description: '该大学拥有的所有 Post' })
  async posts (@Parent() university: University, @Args() args: RelayPagingConfigArgs) {
    const { id } = university
    let { first, orderBy, after } = args
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.postsRelayForward(id, first, after)
    }
    throw new NotImplementedException()
  }

  async postsRelayForward (id: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(posts), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($id: string, $after: string) {
            var(func: uid($id)) @filter(type(University)) {
                posts as posts @filter(type(Post) and not has(delete) and has(createdAt))
            }
            ${after ? q1 : ''}
            totalCount(func: uid(posts)) { count(uid) }
            objs(func: uid(${after ? 'q' : 'posts'}), orderdesc: createdAt, first: ${first}) {
                id: uid
                expand(_all_)
            }
            startO(func: uid(posts), first: -1) { createdAt }
            endO(func: uid(posts), first: 1) { createdAt }
        }
    `
    const res = await this.dbService.commitQuery <RelayfyArrayParam<Post>>({
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
