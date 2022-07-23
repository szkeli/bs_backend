import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { SubField } from '../subfields/models/subfields.model'
import { Subject } from './model/subject.model'

@Resolver(of => SubField)
export class SubFieldResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => Subject, { description: 'SubField 所在的 Subject' })
  async subject (@Parent() subfield: SubField) {
    const { id } = subfield
    const query = `
    query v($id: string) {
        var(func: uid($id)) @filter(type(SubField)) {
            s as subject @filter(type(Subject))
        }
        s(func: uid(s)) {
            id: uid
            expand(_all_)
        }
    }
`
    const res = await this.dbService.commitQuery<{s: Subject[]}>({
      query,
      vars: { $id: id }
    })
    return res.s[0]
  }
}
