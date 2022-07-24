import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Subject } from '../subject/model/subject.model'
import { SubField } from './models/subfields.model'

@Resolver(of => Subject)
export class SubjectResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => [SubField], { description: 'Subject 的所有 SubField' })
  async subFields (@Parent() subject: Subject) {
    const { id } = subject
    const query = `
    query v($id: string) {
      s(func: type(SubField)) @filter(uid_in(subject, uid(subject))) {
        id: uid
        expand(_all_)
      }
      var(func: uid($id)) @filter(type(Subject)) {
        subject as uid
      }
    }
  `
    const res = await this.dbService.commitQuery<{ s: SubField[] }>({
      query,
      vars: { $id: id }
    })
    return res.s
  }
}
