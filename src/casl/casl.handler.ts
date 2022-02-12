import { IPolicyHandler } from '../auth/model/auth.model'
import { PostWithCreatorId } from '../posts/models/post.model'
import { Subject } from '../subject/model/subject.model'
import { Action, AppAbility } from './models/casl.model'

export class ReadPostPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    return ability.can(Action.Read, PostWithCreatorId)
  }
}

export class CreateSubjectPolicyHandler implements IPolicyHandler {
  handle (ability: AppAbility) {
    return ability.can(Action.Create, Subject)
  }
}
