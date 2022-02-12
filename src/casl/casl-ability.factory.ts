import { Ability, AbilityBuilder, AbilityClass, ExtractSubjectType } from '@casl/ability'
import { Injectable } from '@nestjs/common'

import { Role, UserWithRolesAndPrivileges } from '../auth/model/auth.model'
import { PostWithCreatorId } from '../posts/models/post.model'
import { IPRIVILEGE } from '../privileges/models/privileges.model'
import { Subject } from '../subject/model/subject.model'
import { Action, AppAbility, Subjects } from './models/casl.model'
@Injectable()
export class CaslAbilityFactory {
  createForAdminAndUser (user: UserWithRolesAndPrivileges) {
    const { can, build } = new AbilityBuilder<Ability<[Action, Subjects]>>(
      Ability as AbilityClass<AppAbility>
    )

    if (user?.roles?.includes(Role.Admin)) {
      if (user?.userId === 'root') {
        can(Action.Manage, 'all')
      }
    }

    if (this.personIsUser(user) && this.userHasPrivilege(user, IPRIVILEGE.USER_CAN_CREATE_SUBJECT)) {
      can(Action.Create, Subject, 'all')
    }

    can(Action.Read, PostWithCreatorId, 'all')

    return build({
      detectSubjectType: item => item.constructor as ExtractSubjectType<Subjects>
    })
  }

  userHasPrivilege (user: UserWithRolesAndPrivileges, privilege: IPRIVILEGE) {
    let r = false
    user?.privileges?.map(p => {
      if (p.value === privilege) {
        r = true
      }
      return p
    })
    return r
  }

  personIsUser (user: UserWithRolesAndPrivileges) {
    return user?.roles?.includes(Role.User)
  }
}
