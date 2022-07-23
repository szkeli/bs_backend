import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Institute } from '../institutes/models/institutes.model'
import { University } from './models/universities.models'

@Resolver(of => Institute)
export class InstituteResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => University, { description: '当前学院所在的大学' })
  async university (@Parent() university: University) {
    const { id } = university
    const query = `
    query v($id: string) {
      var(func: uid($id)) @filter(type(Institute)) {
        i as ~institutes @filter(type(University))
      }
      i(func: uid(i)) {
        id: uid
        expand(_all_)
      }
    }
  `
    const res = await this.dbService.commitQuery<{i: University[]}>({
      query, vars: { $id: id }
    })

    return res.i[0]
  }
}
