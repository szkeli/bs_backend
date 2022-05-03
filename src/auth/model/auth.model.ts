import { ArgsType, Field, InterfaceType, ObjectType } from '@nestjs/graphql'

import { AppAbility } from '../../casl/models/casl.model'
import { Connection } from '../../connections/models/connections.model'
import { ICredential } from '../../credentials/models/credentials.model'
import { Privilege } from '../../privileges/models/privileges.model'
import { CODE2SESSION_GRANT_TYPE, GENDER, User } from '../../user/models/user.model'

@InterfaceType()
export abstract class Authenable {
  @Field()
    id: string

  @Field()
    createdAt: string
}

@ObjectType({
  implements: [Authenable]
})
export class UserAuthenInfo implements Authenable {
  @Field()
    id: string

  @Field()
    createdAt: string

  @Field({ description: '头像' })
    avatarImageUrl: string

  @Field({ description: '学号' })
    studentId: number | null

  @Field({ description: '学院' })
    college: string

  @Field({ description: '校区' })
    subCampus: string

  @Field({ description: '学校' })
    school: string

  @Field({ description: '年级' })
    grade: string

  @Field(of => GENDER, { description: '性别' })
    gender: GENDER

  @Field(of => [String], { nullable: true, description: '有效信息图片(e.g. 校园卡照片)的链接' })
    images?: string[]
}

@ObjectType()
export class UserAuthenInfosConnection extends Connection<UserAuthenInfo>(UserAuthenInfo) {}

export interface Payload {
  id: string
  roles: Role[]
}

export enum Role {
  User = 'User',
  Admin = 'Admin',
  None = 'None'
}

export type UserWithRoles = User & {
  roles: Role[]
}
export type UserWithRolesAndPrivileges = UserWithRoles & {
  privileges: Privilege[]
}

export type UserWithRolesAndPrivilegesAndCredential = UserWithRolesAndPrivileges & {
  credential: ICredential
}

export interface IPolicyHandler {
  handle: (ability: AppAbility) => boolean
}

type PolicyHandlerCallback = (ability: AppAbility) => boolean

export type PolicyHandler = IPolicyHandler | PolicyHandlerCallback

@ArgsType()
export class LoginByCodeArgs {
  @Field({ description: '从小程序获取的登录 code' })
    code: string

  @Field(of => CODE2SESSION_GRANT_TYPE, { defaultValue: CODE2SESSION_GRANT_TYPE.BLANK_SPACE, description: '登录类型' })
    grantType?: CODE2SESSION_GRANT_TYPE
}
