import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { Person, User } from '../user/models/user.model'
import { Role } from './models/roles.model'

@Resolver(of => Person)
export class UserResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => [Role], { description: '当前用户的所有角色' })
  async roles (@Parent() user: User) {
    const { id } = user
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(User)) {
          roles as roles @filter(type(Role))
        }
        roles(func: uid(roles)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{roles: Role[]}>({
      query,
      vars: { $id: id }
    })

    return res.roles
  }
}
