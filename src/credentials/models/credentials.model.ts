import { Field, ObjectType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

@ObjectType({ description: '凭证是成为管理员的前提' })
export class ICredential {
  @Field()
    id: string

  @Field()
    createdAt: string
}

@ObjectType()
export class ICredentialsConnection extends Connection<ICredential>(ICredential) {}
