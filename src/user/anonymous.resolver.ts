import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { Anonymous } from '../anonymous/models/anonymous.model'
import { CurrentUser } from '../auth/decorator'
import { DbService } from '../db/db.service'
import { User } from './models/user.model'

@Resolver(of => Anonymous)
export class AnonymousResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => User, {
    description: '匿名的创建者，只有创建者自己可见',
    nullable: true
  })
  async creator (@Parent() anonymous: Anonymous, @CurrentUser() user: User) {
    const viewerId = user.id
    const { id } = anonymous
    if (!viewerId) {
      return null
    }
    const query = `
          query v($anonymousId: string, $viewerId: string) {
              anonymous(func: uid($anonymousId)) @filter(uid_in(creator, $viewerId)) {
                  creator @filter(type(User)) {
                      id: uid
                      expand(_all_)
                  }
              }
          }
      `
    const res = await this.dbService.commitQuery<{
      anonymous: Array<{ creator: User }>
    }>({ query, vars: { $anonymousId: id, $viewerId: viewerId } })
    return res.anonymous[0]?.creator
  }
}
