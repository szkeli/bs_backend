import { Args, Query, Resolver } from '@nestjs/graphql'

import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { AuthService } from './auth.service'
import { Roles } from './decorator'
import { Authenable, Role, UserAuthenInfosConnection } from './model/auth.model'

@Resolver(of => Authenable)
export class AuthResolver {
  constructor (private readonly authService: AuthService) {}

  @Query(of => UserAuthenInfosConnection)
  @Roles(Role.Admin)
  async userAuthenInfos (@Args() args: RelayPagingConfigArgs) {
    return await this.authService.userAuthenInfos(args)
  }
}
