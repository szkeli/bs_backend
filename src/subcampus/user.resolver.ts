import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { DbService } from '../db/db.service'
import { PrivateSettings, User } from '../user/models/user.model'
import { SubCampus } from './models/subcampus.model'

@Resolver(of => User)
export class UserResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => [SubCampus], { nullable: true, description: '当前用户所属的校区' })
  async subCampuses (@CurrentUser() currentUser: User, @Parent() user: User) {
    const query = `
    query v($id: string) {
      var(func: uid($id)) @filter(type(User)) {
        settings as privateSettings @filter(type(PrivateSettings))
        subCampuses as ~users @filter(type(SubCampus))
      }
      settings(func: uid(settings)) {
        id: uid
        expand(_all_)
      }
      subCampuses(func: uid(subCampuses)) {
        id: uid
        expand(_all_)
      }
    }
  `
    const res = await this.dbService.commitQuery<{
      settings: PrivateSettings[]
      subCampuses: SubCampus[]
    }>({
      query,
      vars: { $id: user.id }
    })

    if (currentUser?.id !== user.id && res.settings[0]?.isSubCampusPrivate) {
      return null
    }

    return res.subCampuses
  }
}
