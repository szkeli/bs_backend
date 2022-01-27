import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType({ description: '凭证是成为管理员的前提' })
export class ICredential {
  @Field()
    id: string

  @Field()
    createdAt: string
}

@ObjectType()
export class ICredentialsConnection {
  @Field(type => [ICredential])
    nodes: ICredential[]

  @Field(type => Int)
    totalCount: number
}
