import { Ability, InferSubjects } from '@casl/ability'

import { Admin } from '../../admin/models/admin.model'
import { Post } from '../../posts/models/post.model'
import { Subject } from '../../subject/model/subject.model'
import { User } from '../../user/models/user.model'

export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
  Authen = 'Authen'
}

export class ViewAppState {
  kind: 'ViewAppState'
}

export class MustWithCredential {
  kind: 'MustWithCredential'
}

export type Subjects = InferSubjects<typeof Admin | typeof Post | typeof User | typeof Subject | typeof ViewAppState | typeof MustWithCredential> | 'all'
export type AppAbility = Ability<[Action, Subjects]>
