import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Experience } from '../experiences/models/experiences.model'
import { User } from './models/user.model'

@Resolver(of => Experience)
export class ExperienceResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => User, { nullable: true })
  async from (@Parent() experience: Experience) {
    const { id } = experience
    const query = `
    query v($id: string) {
        var(func: uid($id)) @filter(type(ExperiencePointsTransaction)) {
            from as from @filter(type(User))
        }
        from(func: uid(from)) {
            id: uid
            expand(_all_)
        }
    }
`
    const res = await this.dbService.commitQuery<{
      from: User[]
    }>({
      query,
      vars: { $id: id }
    })

    return res.from[0]
  }

  @ResolveField(of => User)
  async to (@Parent() experience: Experience) {
    const { id } = experience
    const query = `
    query v($id: string) {
        var(func: uid($id)) @filter(type(ExperiencePointTransaction)) {
            to as to @filter(type(User))
        }
        to(func: uid(to)) {
            id: uid
            expand(_all_)
        }
    }
`
    const res = await this.dbService.commitQuery<{
      to: User[]
    }>({
      query,
      vars: { $id: id }
    })

    return res.to[0]
  }
}
