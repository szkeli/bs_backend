import { ForbiddenException } from '@nestjs/common'

import { Admin } from '../admin/models/admin.model'
import { IPolicyHandler } from '../auth/model/auth.model'
import { Block } from '../blocks/models/blocks.model'
import { Pin } from '../pins/models/pins.model'
import { PostWithCreatorId } from '../posts/models/post.model'
import { IPRIVILEGE } from '../privileges/models/privileges.model'
import { Subject } from '../subject/model/subject.model'
import { User } from '../user/models/user.model'
import { Action, AppAbility, MustWithCredential, ViewAppState } from './models/casl.model'

export class ReadPostPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    return ability.can(Action.Read, PostWithCreatorId)
  }
}

export class CreateSubjectPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Create, Subject)
    if (!can) {
      throw new ForbiddenException(`缺少 ${IPRIVILEGE.USER_CAN_CREATE_SUBJECT} 权限`)
    }
    return true
  }
}

export class MustWithCredentialPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Manage, MustWithCredential)
    if (!can) {
      throw new ForbiddenException('缺少认证凭证')
    }
    return true
  }
}

export class ViewAppStatePolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Read, ViewAppState)
    if (can) return can
    else {
      throw new ForbiddenException(`缺少 ${IPRIVILEGE.ADMIN_CAN_VIEW_STATE} 权限`)
    }
  }
}

export class AuthenAdminPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Authen, Admin, 'all')
    if (!can) {
      throw new ForbiddenException(`缺少 ${IPRIVILEGE.ADMIN_CAN_AUTHEN_OTHER} 权限`)
    }
    return true
  }
}

export class AuthenUserPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Authen, User, 'all')
    if (!can) {
      throw new ForbiddenException(`缺少 ${IPRIVILEGE.ADMIN_CAN_AUTHEN_USER} 权限`)
    }
    return true
  }
}

export class DeleteSubjectPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Delete, Subject)
    if (!can) {
      throw new ForbiddenException(`缺少 ${IPRIVILEGE.ADMIN_CAN_DELETE_SUBJECT} 权限`)
    }
    return true
  }
}

export class CreatePinPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Create, Pin)
    if (!can) {
      throw new ForbiddenException(`缺少 ${IPRIVILEGE.ADMIN_CAN_ADD_PIN_ON_POST} 权限`)
    }
    return true
  }
}

export class DeletePinPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Delete, Pin)
    if (!can) {
      throw new ForbiddenException(`缺少 ${IPRIVILEGE.ADMIN_CAN_REMOVE_PIN_ON_POST} 权限`)
    }
    return true
  }
}

export class AddBlockOnUserPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Create, Block)
    if (!can) {
      throw new ForbiddenException(`缺少 ${IPRIVILEGE.ADMIN_CAN_ADD_BLOCK_ON_USER} 权限`)
    }
    return true
  }
}

export class RemoveBlockOnUserPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Delete, Block)
    if (!can) {
      throw new ForbiddenException(`缺少 ${IPRIVILEGE.ADMIN_CAN_REMOVE_BLOCK_ON_USER} 权限`)
    }
    return true
  }
}
