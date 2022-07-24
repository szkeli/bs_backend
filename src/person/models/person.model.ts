import { createUnionType } from '@nestjs/graphql'

import { Admin } from '../../admin/models/admin.model'
import { User } from '../../user/models/user.model'

export const AdminAndUserUnion = createUnionType({
  name: 'AdminAndUserUnion',
  types: () => [User, Admin],
  resolveType: (v: {'dgraph.type': Array<'User'| 'Admin'>}) => {
    if (v['dgraph.type']?.includes('Admin')) {
      return Admin
    }
    if (v['dgraph.type']?.includes('User')) {
      return User
    }
  }
})
