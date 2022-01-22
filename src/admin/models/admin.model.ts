import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql'

import { Role } from '../../auth/model/auth.model'
import { Node } from '../../node/models/node.model'
import { Person } from '../../user/models/user.model'

@ArgsType()
export class RegisterAdminArgs {
  @Field()
    userId: string

  @Field()
    name: string

  @Field()
    avatarImageUrl: string

  @Field({ description: '管理员密码' })
    sign: string
}

@ObjectType({
  implements: [Node, Person]
})
export class Admin implements Node, Person {
  constructor (admin: Admin) {
    Object.assign(this, admin)
  }

  @Field()
    id: string

  @Field()
    userId: string

  @Field()
    name: string

  @Field()
    avatarImageUrl: string

  @Field()
    createdAt: string

  @Field()
    updatedAt: string

  @Field()
    lastLoginedAt: string
}

@ObjectType()
export class AdminsConnection {
  @Field(type => [Admin])
    nodes: Admin[]

  @Field(type => Int)
    totalCount: number
}

export type CheckAdminResult = Admin & {success: boolean, roles: Role[]}

@ObjectType()
export class Credential {
  @Field()
    id: string

  @Field()
    createdAt: string
}

@ObjectType()
export class CredentialsConnection {
  @Field(type => [Credential])
    nodes: Credential[]

  @Field(type => Int)
    totalCount: number
}
