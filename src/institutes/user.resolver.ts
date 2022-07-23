import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { DbService } from '../db/db.service'
import { PrivateSettings, User } from '../user/models/user.model'
import { Institute } from './models/institutes.model'

@Resolver(of => User)
export class UserResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => [Institute], { nullable: true, description: '当前用户所属的学院' })
  async institutes (@CurrentUser() currentUser: User, @Parent() user: User) {
    const query = `
    query v($id: string) {
      var(func: uid($id)) @filter(type(User)) {
        settings as privateSettings @filter(type(PrivateSettings))
        institutes as ~users @filter(type(Institute))
      }
      settings(func: uid(settings)) {
        id: uid
        expand(_all_)
      }
      institutes(func: uid(institutes)) {
        id: uid
        expand(_all_)
      }
    }
  `
    const res = await this.dbService.commitQuery<{
      settings: PrivateSettings[]
      institutes: Institute[]
    }>({
      query,
      vars: { $id: user.id }
    })

    if (res.settings[0]?.isInstitutePrivate && currentUser?.id !== user.id) {
      return null
    }

    return res.institutes
  }
}
