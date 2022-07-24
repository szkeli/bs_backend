import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Subject } from '../subject/model/subject.model'
import { User } from './models/user.model'

@Resolver(of => Subject)
export class SubjectResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => User, { description: '主题的创建者' })
  async creator (@Parent() subject: Subject): Promise<User> {
    const { id } = subject
    const query = `
        query v($id: string) {
            var(func: uid($id)) @filter(type(Subject)) {
                c as creator@filter(type(User)) 
            }
            creator(func: uid(c)) {
                id: uid
                expand(_all_)
            }
        }
    `

    const res = await this.dbService.commitQuery<{creator: User[]}>({
      query,
      vars: { $id: id }
    })

    return res.creator[0]
  }
}
