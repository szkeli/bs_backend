import { NotImplementedException } from '@nestjs/common'
import { Info, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { DbService } from '../db/db.service'
import { User } from '../user/models/user.model'
import { UserService } from '../user/user.service'
import { Creatable } from './models/creatable.model'

@Resolver(of => Creatable)
export class CreatableResolver {
  constructor (
    private readonly dbService: DbService,
    private readonly userService: UserService
  ) {}

  @ResolveField(of => User, { nullable: true })
  async creator (@Parent() creatable: Creatable, @Info() info) {
    if (info?.path?.typename === 'Post') {
      return await this.userService.findCreatorByPostId(creatable.id)
    }

    throw new NotImplementedException()
  }
}
