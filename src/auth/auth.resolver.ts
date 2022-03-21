import { ForbiddenException } from '@nestjs/common'
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { AuthenAdminPolicyHandler, AuthenUserPolicyHandler, MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { ICredential } from '../credentials/models/credentials.model'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { AuthenticateUserArgs, PersonWithRoles, User } from '../user/models/user.model'
import { AuthService } from './auth.service'
import { CheckPolicies, CurrentUser, Roles } from './decorator'
import { Authenable, Role, UserAuthenInfosConnection } from './model/auth.model'

@Resolver(of => Authenable)
export class AuthResolver {
  constructor (private readonly authService: AuthService) {}

  @Query(of => UserAuthenInfosConnection)
  @Roles(Role.Admin)
  async userAuthenInfos (@Args() args: RelayPagingConfigArgs) {
    return await this.authService.userAuthenInfos(args)
  }

  @Mutation(of => User, { description: '认证用户' })
  @Roles(Role.Admin, Role.User)
  async authenticateUser (@CurrentUser() person: PersonWithRoles, @Args() { id, token, info }: AuthenticateUserArgs) {
    if (person.id === id && token) {
      return await this.authService.autoAuthenUserSelf(id, token)
    }

    if (person.id === id && info) {
      return await this.authService.addInfoForAuthenUser(id, info)
    }

    if (person.roles.includes(Role.Admin) && info) {
      return await this.authService.authenticateUser(person.id, id, info)
    }

    throw new ForbiddenException()
  }

  @Mutation(of => ICredential, { description: '已存在的管理员认证一个新注册的管理员' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler(), new AuthenAdminPolicyHandler())
  async authenAdmin (@CurrentUser() admin: Admin, @Args('to') to: string) {
    return await this.authService.authenAdmin(admin.id, to)
  }

  @Mutation(of => ICredential, { description: '管理员认证一个新注册的用户' })
  @Roles(Role.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler(), new AuthenUserPolicyHandler())
  async authenUser (@CurrentUser() admin: Admin, @Args('to')to: string) {
    return await this.authService.authenUser(admin.id, to)
  }
}
