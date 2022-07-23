import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Deadline } from '../deadlines/models/deadlines.model'
import { Lesson } from './models/lessons.model'

@Resolver(of => Deadline)
export class DeadlineResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => Lesson, { description: 'deadline 对应的课程', nullable: true })
  async lesson (@Parent() deadline: Deadline) {
    const { id } = deadline
    const query = `
    query v($id: string) {
      var(func: uid($id)) @filter(type(Deadline)) {
        lesson as lesson @filter(type(Lesson))
      }
      lesson(func: uid(lesson)) {
        id: uid
        expand(_all_)
      }
    }
  `
    const res = await this.dbService.commitQuery<{lesson: Lesson[]}>({ query, vars: { $id: id } })

    return res.lesson[0]
  }
}
