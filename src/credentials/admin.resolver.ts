import { NotImplementedException } from '@nestjs/common'
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { handleRelayForwardAfter, relayfyArrayForward } from '../tool'
import { ICredential, ICredentialsConnection } from './models/credentials.model'

@Resolver(of => Admin)
export class AdminResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => ICredential, { nullable: true, description: '管理员的凭证' })
  async credential (@Parent() admin: Admin) {
    const { id } = admin
    const query = `
    query v($id: string) {
      var(func: uid($id)) {
        c as credential @filter(type(Credential))
      }
      credential(func: uid(c)) {
        id: uid
        expand(_all_)
      }
    }
  `
    const res = await this.dbService.commitQuery<{credential: ICredential[]}>({
      query,
      vars: { $id: id }
    })

    return res.credential[0]
  }

  @ResolveField(of => ICredentialsConnection, { description: '当前管理员认证过的其他管理员' })
  async credentials (@Parent() admin: Admin, @Args() args: RelayPagingConfigArgs) {
    const { id } = admin
    let { first, after, orderBy } = args
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.credentialsWithRelayForward(id, first, after)
    }
    throw new NotImplementedException()
  }

  async credentialsWithRelayForward (id: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(credentials), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(Admin)) {
          credentials as credentials @filter(type(Credential))
        }

        ${after ? q1 : ''}
        totalCount (func: uid(credentials)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'credentials'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(credentials), first: -1) {
          createdAt
        }
        endO(func: uid(credentials), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startO: Array<{createdAt: string}>
      endO: Array<{createdAt: string}>
      objs: ICredential[]
    }>({ query, vars: { $id: id, $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }
}
