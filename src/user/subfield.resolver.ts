import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { DbService } from '../db/db.service'
import { SubField } from '../subfields/models/subfields.model'

@Resolver(of => SubField)
export class SubFieldResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => Admin, { description: 'SubField 的创建者' })
  async creator (@Parent() subField: SubField) {
    const { id } = subField
    const query = `
    query v($id: string) {
      var(func: uid($id)) @filter(type(SubField)) {
        creator as creator @filter(type(Admin))
      }
      c(func: uid(creator)) {
        id: uid
        expand(_all_)
      }
    }
  `
    const res = await this.dbService.commitQuery<{c: Admin[]}>({ query, vars: { $id: id } })
    return res.c[0]
  }
}
