import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Privilege } from '../privileges/models/privileges.model'
import { AdminAndUserUnion } from './models/person.model'

@Resolver(of => Privilege)
export class PrivilegeResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => AdminAndUserUnion, { description: '权限作用的对象' })
  async to (@Parent() privilege: Privilege) {
    const { id } = privilege
    const query = `
    query v($uid: string) {
      var(func: uid($uid)) @filter(type(Privilege)) {
        to as to @filter(type(User) OR type(Admin))
      }
      to(func: uid(to)) {
        id: uid
        expand(_all_)
        dgraph.type
      }
    }
  `
    const res = await this.dbService.commitQuery<{
      to: Array<typeof AdminAndUserUnion>
    }>({ query, vars: { $uid: id } })

    return res.to[0]
  }
}
