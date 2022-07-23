import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { CurrentUser } from '../auth/decorator'
import { DbService } from '../db/db.service'
import { PrivateSettings, User } from '../user/models/user.model'
import { University } from './models/universities.models'

@Resolver(of => User)
export class UserResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => University, { nullable: true, description: '当前用户所在的大学' })
  async university (@CurrentUser() currentUser: User, @Parent() user: User) {
    const query = `
    query v($id: string) {
      var(func: uid($id)) @filter(type(User)) {
        settings as privateSettings @filter(type(PrivateSettings))
        ~users @filter(type(University)) {
          university as uid
        }
      }
      settings(func: uid(settings)) {
        id: uid
        expand(_all_)
      }
      university(func: uid(university)) {
        id: uid
        expand(_all_)
      }
    }
  `
    const res = await this.dbService.commitQuery<{
      university: University[]
      settings: PrivateSettings[]
    }>({
      query,
      vars: { $id: user.id }
    })

    // 当前用户不是自己时，根据设定判断是否返回 null
    if (currentUser?.id !== user.id && res.settings[0]?.isUniversityPrivate) {
      return null
    }

    return res.university[0]
  }
}
