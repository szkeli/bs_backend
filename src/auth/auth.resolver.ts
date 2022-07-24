import { ForbiddenException } from '@nestjs/common'
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver
} from '@nestjs/graphql'

import { sign as sign_calculus } from 'src/tool'

import { Admin } from '../admin/models/admin.model'
import {
  AuthenAdminPolicyHandler,
  MustWithCredentialPolicyHandler
} from '../casl/casl.handler'
import { ICredential } from '../credentials/models/credentials.model'
import { Delete } from '../deletes/models/deletes.model'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import {
  AuthenticateUserArgs,
  LoginResult,
  Person,
  PersonLoginArgs,
  PersonWithRoles,
  User
} from '../user/models/user.model'
import { AuthService } from './auth.service'
import {
  CheckPolicies,
  CurrentPerson,
  CurrentUser,
  NoAuth,
  Roles
} from './decorator'
import {
  Authenable,
  LoginByCodeArgs,
  Role,
  UpdatePasswordArgs,
  UpdatePasswordResultUnion,
  UserAuthenInfosConnection
} from './model/auth.model'

@Resolver(of => Authenable)
export class AuthResolver {
  constructor (private readonly authService: AuthService) {}

  @Mutation(of => LoginResult, { description: '登录' })
  @NoAuth()
  async login (@Args() args: PersonLoginArgs): Promise<LoginResult> {
    const v = sign_calculus(args.sign)
    return await this.authService.login(args.userId, args.id, v)
  }

  @Mutation(of => LoginResult, { description: '通过小程序的code进行登录' })
  @NoAuth()
  async loginByCode (@Args() args: LoginByCodeArgs) {
    return await this.authService.loginByCode(args)
  }

  @Mutation(of => UpdatePasswordResultUnion, { description: '更改密码' })
  @Roles(Role.Admin, Role.User)
  async updatePassword (
  @CurrentPerson() person: Person,
    @Args() { sign }: UpdatePasswordArgs
  ) {
    const v = sign_calculus(sign)
    return await this.authService.updatePassword(person.id, v)
  }

  @Query(of => UserAuthenInfosConnection, {
    description: '待通过审核的用户信息'
  })
  @Roles(Role.Admin)
  async userAuthenInfos (@Args() args: RelayPagingConfigArgs) {
    return await this.authService.userAuthenInfos(args)
  }

  @Mutation(of => User, { description: '认证用户' })
  @Roles(Role.Admin, Role.User)
  async authenUser (
  @CurrentUser() person: PersonWithRoles,
    @Args() { id, token, info }: AuthenticateUserArgs
  ) {
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

  @Mutation(of => ICredential, {
    description: '已存在的管理员认证一个新注册的管理员'
  })
  @Roles(Role.Admin)
  @CheckPolicies(
    new MustWithCredentialPolicyHandler(),
    new AuthenAdminPolicyHandler()
  )
  async authenAdmin (@CurrentUser() admin: Admin, @Args('to') to: string) {
    return await this.authService.authenAdmin(admin.id, to)
  }

  @ResolveField(of => User, { description: '提交信息的用户' })
  async to (@Parent() authenable: Authenable) {
    return await this.authService.to(authenable.id)
  }

  @ResolveField(of => Delete, {
    description: '审核信息的删除者',
    nullable: true
  })
  async delete (@Parent() authenable: Authenable) {
    return await this.authService.delete(authenable.id)
  }
}
