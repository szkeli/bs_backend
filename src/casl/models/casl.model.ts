import { Ability, InferSubjects } from '@casl/ability'

import { Post } from '../../posts/models/post.model'
import { User } from '../../user/models/user.model'

export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete'
}
export type Subjects = InferSubjects<typeof Post | typeof User> |'all'
export type AppAbility = Ability<[Action, Subjects]>
