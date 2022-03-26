import { Admin } from '../admin/models/admin.model'
import { LackSomeOfPrivilegeException, MustWithCredentialException } from '../app.exception'
import { IPolicyHandler } from '../auth/model/auth.model'
import { Block } from '../blocks/models/blocks.model'
import { Pin } from '../pins/models/pins.model'
import { IPRIVILEGE } from '../privileges/models/privileges.model'
import { Subject } from '../subject/model/subject.model'
import { User } from '../user/models/user.model'
import { Action, AppAbility, MustWithCredential, ViewAppState } from './models/casl.model'

export class CreateSubjectPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Create, Subject)
    if (!can) {
      throw new LackSomeOfPrivilegeException(IPRIVILEGE.USER_CAN_CREATE_SUBJECT)
    }
    return true
  }
}

export class MustWithCredentialPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Manage, MustWithCredential)
    if (!can) {
      throw new MustWithCredentialException()
    }
    return true
  }
}

export class ViewAppStatePolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Read, ViewAppState)
    if (!can) {
      throw new LackSomeOfPrivilegeException(IPRIVILEGE.ADMIN_CAN_VIEW_STATE)
    }
    return true
  }
}

export class AuthenAdminPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Authen, Admin, 'all')
    if (!can) {
      throw new LackSomeOfPrivilegeException(IPRIVILEGE.ADMIN_CAN_AUTHEN_OTHER)
    }
    return true
  }
}

export class AuthenUserPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Authen, User, 'all')
    if (!can) {
      throw new LackSomeOfPrivilegeException(IPRIVILEGE.ADMIN_CAN_AUTHEN_USER)
    }
    return true
  }
}

export class DeleteSubjectPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Delete, Subject)
    if (!can) {
      throw new LackSomeOfPrivilegeException(IPRIVILEGE.ADMIN_CAN_DELETE_SUBJECT)
    }
    return true
  }
}

export class CreatePinPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Create, Pin)
    if (!can) {
      throw new LackSomeOfPrivilegeException(IPRIVILEGE.ADMIN_CAN_ADD_PIN_ON_POST)
    }
    return true
  }
}

export class DeletePinPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Delete, Pin)
    if (!can) {
      throw new LackSomeOfPrivilegeException(IPRIVILEGE.ADMIN_CAN_REMOVE_PIN_ON_POST)
    }
    return true
  }
}

export class AddBlockOnUserPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Create, Block)
    if (!can) {
      throw new LackSomeOfPrivilegeException(IPRIVILEGE.ADMIN_CAN_ADD_BLOCK_ON_USER)
    }
    return true
  }
}

export class RemoveBlockOnUserPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    const can = ability.can(Action.Delete, Block)
    if (!can) {
      throw new LackSomeOfPrivilegeException(IPRIVILEGE.ADMIN_CAN_REMOVE_BLOCK_ON_USER)
    }
    return true
  }
}
