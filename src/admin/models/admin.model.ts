import { ArgsType, Field, ObjectType } from '@nestjs/graphql'

import { Role } from '../../auth/model/auth.model'
import { Connection } from '../../connections/models/connections.model'

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

@ObjectType()
export class Admin {
  constructor (admin: Admin) {
    Object.assign(this, admin)
  }

  @Field()
    id: string

  @Field()
    userId: string

  @Field()
    name: string

  @Field({ nullable: true })
    avatarImageUrl?: string | null

  @Field()
    createdAt: string

  @Field()
    updatedAt: string

  @Field()
    lastLoginedAt: string
}

@ObjectType()
export class AdminsConnection extends Connection<Admin>(Admin) {}

export type CheckAdminResult = Admin & {success: boolean, roles: Role[]}
