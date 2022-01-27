import { ObjectType, Field, Int } from '@nestjs/graphql'

@ObjectType()
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
