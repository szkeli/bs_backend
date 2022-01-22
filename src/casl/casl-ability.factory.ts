import { Ability, AbilityBuilder, AbilityClass, ExtractSubjectType } from '@casl/ability'
import { Injectable } from '@nestjs/common'

import { Role, UserWithRoles } from '../auth/model/auth.model'
import { PostWithCreatorId } from '../posts/models/post.model'
import { Action, AppAbility, Subjects } from './models/casl.model'
@Injectable()
export class CaslAbilityFactory {
  createForAdminAndUser (user: UserWithRoles) {
    const { can, cannot, build } = new AbilityBuilder<Ability<[Action, Subjects]>>(
      Ability as AbilityClass<AppAbility>
    )

    if (user.roles.includes(Role.Admin)) {
      if (user.userId === 'root') {
        can(Action.Manage, 'all')
      }
    }

    can(Action.Read, PostWithCreatorId, 'all')

    return build({
      detectSubjectType: item => item.constructor as ExtractSubjectType<Subjects>
    })
  }
}
