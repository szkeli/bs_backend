import { ArgsType, Field, ObjectType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

@ObjectType()
export class Institute {
  @Field()
    id: string

  @Field()
    logoUrl: string

  @Field()
    name: string

  @Field()
    createdAt: string
}

@ObjectType()
export class InstitutesConnection extends Connection<Institute>(Institute) {}

@ArgsType()
export class CreateInstituteArgs {
  @Field({ description: '学院所在的大学的 id' })
    id: string

  @Field({ description: '学院的名字' })
    name: string

  @Field({ description: '学院的 logo' })
    logoUrl: string
}
