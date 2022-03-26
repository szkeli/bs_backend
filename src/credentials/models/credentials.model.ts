import { createUnionType, Field, ObjectType } from '@nestjs/graphql'

import { Admin } from '../../admin/models/admin.model'
import { Connection } from '../../connections/models/connections.model'
import { User } from '../../user/models/user.model'

@ObjectType({ description: '凭证是成为管理员的前提' })
export class ICredential {
  @Field()
    id: string

  @Field()
    createdAt: string
}

export const CredentialToUnion = createUnionType({
  name: 'CredentialToUnion',
  types: () => [Admin, User],
  resolveType (v: {'dgraph.type': string[]}) {
    if (v['dgraph.type']?.includes('User')) {
      return User
    }
    if (v['dgraph.type']?.includes('Admin')) {
      return Admin
    }
  }
})

@ObjectType()
export class ICredentialsConnection extends Connection<ICredential>(ICredential) {}
