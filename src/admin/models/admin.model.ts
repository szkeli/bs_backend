import { ArgsType, Field, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

import { Role } from '../../auth/model/auth.model'
import { Node } from '../../node/models/node.model'
import { Person } from '../../user/models/user.model'

export enum PRIVILEGE {
  ROOT = 'ROOT',
  // 能够认证并创建管理员
  CAN_CREATE_ADMIN = 'CAN_CREATE_ADMIN',
  // 能删除Admin
  CAN_DELETE_ADMIN = 'CAN_DELETE_ADMIN',
  // 能删除User
  CAN_DELETE_USER = 'CAN_DELETE_USER',
  // 能创建User
  CAN_CREATE_USER = 'CAN_ADD_USER',
  // 能更新User
  CAN_UPDATE_USER = 'CAN_UPDATE_USER',
}

registerEnumType(PRIVILEGE, {
  name: 'PRIVILEGE'
})

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

@ArgsType()
export class AdminLoginArgs {
  @Field()
    userId: string

  @Field()
    sign: string
}

@ObjectType()
export class AdminLoginResult {
  @Field()
    token: string
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

  @Field(type => [PRIVILEGE])
    privileges: PRIVILEGE[]
}

@InputType()
export class CreateAdminInput {
  @Field()
    userId: string

  @Field()
    name: string

  @Field()
    avatarImageUrl: string
}

@ObjectType()
export class InviteTokenResult {
  @Field()
    token: string
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
