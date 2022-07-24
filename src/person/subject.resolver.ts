import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Subject } from '../subject/model/subject.model'
import { AdminAndUserUnion } from './models/person.model'

@Resolver(of => Subject)
export class SubjectResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => AdminAndUserUnion, { description: '主题的创建者' })
  async creator (@Parent() subject: Subject): Promise<typeof AdminAndUserUnion> {
    const { id } = subject
    const query = `
        query v($id: string) {
            var(func: uid($id)) @filter(type(Subject)) {
                c as creator@filter(type(User) or type(Admin)) 
            }
            creator(func: uid(c)) {
                id: uid
                expand(_all_)
                dgraph.type
            }
        }
    `

    const res = await this.dbService.commitQuery<{creator: Array<typeof AdminAndUserUnion>}>({
      query,
      vars: { $id: id }
    })

    return res.creator[0]
  }
}
