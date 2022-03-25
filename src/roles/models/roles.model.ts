import { ArgsType, Field, ObjectType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

@ObjectType()
export class Role {
  @Field(of => String)
    title: string

  @Field(of => String)
    createdAt: string

  @Field(of => String)
    id: string
}

@ObjectType()
export class RolesConnection extends Connection<Role>(Role) {}

@ArgsType()
export class CreateRoleArgs {
  @Field()
    title: string
}
