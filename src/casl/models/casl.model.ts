import { Ability, InferSubjects } from '@casl/ability'

import { Post } from '../../posts/models/post.model'
import { Subject } from '../../subject/model/subject.model'
import { User } from '../../user/models/user.model'

export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete'
}
export type Subjects = InferSubjects<typeof Post | typeof User | typeof Subject> | 'all'
export type AppAbility = Ability<[Action, Subjects]>
