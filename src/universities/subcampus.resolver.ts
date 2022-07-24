import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { SubCampus } from '../subcampus/models/subcampus.model'
import { University } from './models/universities.models'

@Resolver(of => SubCampus)
export class SubCampusResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => University)
  async university (@Parent() subcampus: SubCampus) {
    const { id } = subcampus
    const query = `
    query v($id: string) {
        var(func: uid($id)) @filter(type(SubCampus)) {
            university as ~subCampuses @filter(type(University))
        }
        university(func: uid(university)) {
            id: uid
            expand(_all_)
        }
    }
  `
    const res = await this.dbService.commitQuery<{
      university: University[]
    }>({
      query,
      vars: { $id: id }
    })

    return res.university[0]
  }
}
