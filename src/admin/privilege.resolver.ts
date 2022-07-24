import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Privilege } from '../privileges/models/privileges.model'
import { Admin } from './models/admin.model'

@Resolver(of => Privilege)
export class PrivilegeResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => Admin, { description: '权限的创建者' })
  async creator (@Parent() privilege: Privilege) {
    const { id } = privilege
    const query = `
    query v($uid: string) {
      privilege(func: uid($uid)) @filter(type(Privilege)) {
        creator @filter(type(Admin)) {
          id: uid
          expand(_all_)
        }
      }
    }
  `
    const res = await this.dbService.commitQuery<{
      privilege: Array<{ creator: Admin }>
    }>({ query, vars: { $uid: id } })
    return res.privilege[0]?.creator
  }
}
