import { ArgsType, Field, ObjectType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

@ObjectType()
export class SubCampus {
  @Field()
    id: string

  @Field()
    name: string
}

@ObjectType()
export class SubCampusesConnection extends Connection<SubCampus>(SubCampus) {}

@ArgsType()
export class CreateSubCampusArgs {
  @Field({ description: '校区所在的大学' })
    id: string

  @Field({ description: '校区的名字' })
    name: string
}
