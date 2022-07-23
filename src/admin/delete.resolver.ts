import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Delete } from '../deletes/models/deletes.model'
import { AdminAndUserUnion } from '../user/models/user.model'

@Resolver(of => Delete)
export class DeleteResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => AdminAndUserUnion, { description: '删除的创建者' })
  async creator (@Parent() d: Delete) {
    const query = `
    query v($deleteId: string) {
      var(func: uid($deleteId)) @filter(type(Delete)) {
        c as creator @filter(type(Admin) or type(User))
      }
      creator(func: uid(c)) {
        id: uid
        expand(_all_)
        dgraph.type
      }
    }
  `
    return await this.dbService.commitQuery<{creator: Array<typeof AdminAndUserUnion>}>({ query, vars: { $deleteId: d.id } })
  }
}
