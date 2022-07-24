import { Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { CheckPolicies, Roles } from '../auth/decorator'
import { Authenable, Role as IRole, UserAuthenInfo } from '../auth/model/auth.model'
import { MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { DbService } from '../db/db.service'
import { Role } from './models/roles.model'

@Resolver(of => UserAuthenInfo)
export class UserAuthenInfoResolver {
  constructor (private readonly dbService: DbService) {}

  @ResolveField(of => [Role], { description: '用户申请的角色' })
  @Roles(IRole.Admin)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async roles (@Parent() authenable: Authenable) {
    const { id } = authenable
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(UserAuthenInfo)) {
          r as roles @filter(type(Role))
        }
        roles(func: uid(r)) {
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
