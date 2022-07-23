import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { User } from '../user/models/user.model'
import { ICredential } from './models/credentials.model'

@Resolver(of => User)
export class UserResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => ICredential, { description: '当前用户的认证凭证，未认证用户为null', nullable: true })
  async credential (@Parent() user: User) {
    const query = `
    query v($xid: string) {
      var(func: uid($xid)) @filter(type(User)) {
        c as credential @filter(type(Credential))
      }
      credential(func: uid(c)) {
        id: uid
        expand(_all_)
      }
    }
  `
    const res = await this.dbService.commitQuery<{credential: ICredential[]}>({ query, vars: { $xid: user.id } })

    return res.credential[0]
  }
}
