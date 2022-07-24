import {
  ArgsType,
  createUnionType,
  Field,
  InputType,
  Int,
  InterfaceType,
  ObjectType,
  registerEnumType
} from '@nestjs/graphql'

import { UserId } from 'src/db/model/db.model'

import { Admin } from '../../admin/models/admin.model'
import { Role } from '../../auth/model/auth.model'
import { Connection } from '../../connections/models/connections.model'
import { Node } from '../../node/models/node.model'
import {
  NOTIFICATION_ACTION,
  NOTIFICATION_TYPE
} from '../../notifications/models/notifications.model'

export enum CODE2SESSION_GRANT_TYPE {
  BLANK_SPACE = 'BLANK_SPACE',
  CURRICULUM = 'CURRICULUM',
  WXOPEN = 'WXOPEN',
  UNKNOWN = 'UNKNOWN',
}

registerEnumType(CODE2SESSION_GRANT_TYPE, {
  name: 'CODE2SESSION_GRANT_TYPE',
  description: '登录类型',
  valuesMap: {
    BLANK_SPACE: {
      description: '通过白板小程序'
    },
    CURRICULUM: {
      description: '通过课表小程序'
    },
    WXOPEN: {
      description: '微信公众号'
    },
    UNKNOWN: {
      description: '未知的登录类型'
    }
  }
})

export enum ORDERBY {
  // 时间戳从大到小
  DESC = 'DESC',
  // 随机排列
  SHUFFLE = 'SHUFFLE',
  // 时间戳从小到大
  ASC = 'ASC',
}

registerEnumType(ORDERBY, {
  name: 'ORDERBY'
})

export enum GENDER {
  NONE = 'NONE',
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

registerEnumType(GENDER, {
  name: 'GENDER'
})

@ArgsType()
export class PersonLoginArgs {
  @Field(of => String, { description: '用户账号', nullable: true })
    userId?: string | null

  @Field(of => String, { description: '用户id', nullable: true })
    id?: string | null

  @Field(of => String, { description: '用户密码' })
    sign: string
}

@InputType()
export class AuthenticationInfo {
  @Field(of => String, { description: '用户头像' })
    avatarImageUrl: string

  @Field(of => String, { description: '用户昵称' })
    name: string

  @Field(of => Int, { description: '学号' })
    studentId: number | null

  @Field(of => [String], { description: '学院的id的数组' })
    institutes: string[]

  @Field(of => [String], { description: '校区的id的数组' })
    subCampuses: string[]

  @Field(of => [String], { description: '大学的id的数组' })
    universities: string[]

  @Field({ description: '年级' })
    grade: string

  @Field(of => GENDER, { description: '性别' })
    gender: GENDER

  @Field(of => [String], {
    description: '有效信息图片(e.g. 校园卡照片)的链接'
  })
    images?: string[]

  @Field(of => [String], {
    description: '用户申请的角色的id的数组',
    nullable: true
  })
    roles?: string[]
}

@ArgsType()
export class AuthenticateUserArgs {
  @Field({ description: '待认证的用户id' })
    id: string

  @Field({
    nullable: true,
    description: '自助认证时 szu 后端提供的token (保证不被篡改，用 jwt 实现)'
  })
    token?: string

  @Field({ nullable: true, description: '手动认证时的认证信息' })
    info?: AuthenticationInfo
}

@ArgsType()
export class UpdateUserArgs {
  @Field(of => String, { nullable: true })
    avatarImageUrl?: string | null

  @Field(of => String, { nullable: true })
    userId?: string | null

  @Field(of => String, { nullable: true })
    name?: string | null

  @Field(of => String, { nullable: true })
    sign?: string | null
}

@ArgsType()
export class RegisterUserArgs {
  @Field(of => String, { description: '用户名', nullable: true })
    userId?: string | null

  @Field(of => String, { description: '用户昵称' })
    name: string

  @Field(of => String, { description: '用户密码' })
    sign: string

  @Field(of => String, { description: 'code', nullable: true })
    code?: string | null

  @Field(of => CODE2SESSION_GRANT_TYPE, {
    defaultValue: CODE2SESSION_GRANT_TYPE.BLANK_SPACE,
    nullable: true,
    description: '登录类型'
  })
    grantType: CODE2SESSION_GRANT_TYPE
}

export type RawSign = string

@ObjectType({
  implements: () => [Person, Node]
})
export class User implements Person, Node {
  constructor (user: User) {
    Object.assign(this, user)
  }

  @Field(of => String, { description: 'id 自动生成' })
    id: string

  @Field(of => Int, { description: '学号', nullable: true })
    studentId?: number | null

  @Field(of => String, { description: '用户昵称' })
    name: string

  @Field(of => String, { description: '用户账号' })
    userId: string

  @Field(of => String, {
    description: '微信openId,注册时传入微信code自动通过微信提供的接口获取获取'
  })
    openId: string

  @Field(of => String, {
    description: '微信unionId,注册时传入微信code自动通过微信提供的接口获取获取'
  })
    unionId: string

  @Field(of => GENDER, { nullable: true, description: '用户性别' })
    gender?: GENDER | null

  @Field(of => String, {
    description: '学院',
    nullable: true,
    deprecationReason: 'feature/multiuniversity 后废弃，请使用 institutes 代替'
  })
    college?: string | null

  @Field(of => String, {
    description: '校区',
    nullable: true,
    deprecationReason:
      'feature/multiuniversity 后废弃，请使用 subCampuses 代替'
  })
    subCampus?: string | null

  @Field(of => String, {
    description: '学校',
    nullable: true,
    deprecationReason: 'feature/multiuniversity 后废弃，请使用 university 代替'
  })
    school?: string | null

  @Field(of => String, { description: '年级', nullable: true })
    grade?: string | null

  @Field(of => String, { description: '用户创建时间' })
    createdAt: string

  @Field(of => String, { description: '用户信息的更新时间' })
    updatedAt: string

  @Field(of => String, { description: '用户上一次调用login接口获取token的系统时间' })
    lastLoginedAt: string

  @Field(of => String, { description: '用户头像链接', nullable: true })
    avatarImageUrl?: string | null

  @Field(of => Int, { description: '当前用户的经验', nullable: true })
    experiencePoints?: number | null

  @Field(of => Int, { description: '当前用户的连续签到天数', nullable: true })
    dailyCheckInSum?: number | null
}

export class UserWithFacets extends User {
  /**
   * 学院属性是否私有
   */
  'college|private'?: boolean

  /**
   * 校区属性是否私有
   *
   */
  'subCampus|private'?: boolean

  /**
   * 性别属性是否私有
   */
  'gender|private'?: boolean

  /**
   * 学校属性是否私有
   */
  'school|private'?: boolean

  /**
   * 年级属性是否私有
   */
  'grade|private'?: Boolean
}

@ObjectType({
  implements: () => [Node]
})
export class LoginResult extends User implements Node {
  @Field({ description: 'token' })
    token: string
}

@InterfaceType({
  implements: () => [Node]
})
export abstract class Person implements Node {
  constructor (person: Person) {
    Object.assign(this, person)
  }

  @Field(type => String)
    userId: UserId

  @Field()
    name: string

  @Field()
    id: string
}

export type PersonWithRoles = Person & {
  roles: Role[]
}

@ObjectType()
export class UsersConnection {
  @Field(type => [User])
    nodes: User[]

  @Field(type => Int)
    totalCount: number
}

@ObjectType()
export class UsersConnectionWithRelay extends Connection<User>(User) {}

@ArgsType()
export class PagingConfigArgs {
  @Field(type => Int, { nullable: true, defaultValue: 10 })
    first: number

  @Field(type => Int, { nullable: true, defaultValue: 0 })
    offset: number
}

export type CheckUserResult = User & { success: boolean, roles: Role[] }

export const WhoAmIUnion = createUnionType({
  name: 'WhoAmIUnion',
  types: () => [User, Admin]
})

@ArgsType()
export class DeadlinesPagingArgs {
  @Field()
    startTime: string

  @Field()
    endTime: string

  @Field(type => Int)
    first: number
}

@ArgsType()
export class NotificationArgs {
  @Field(of => NOTIFICATION_TYPE, {
    description: '获取',
    nullable: true,
    defaultValue: NOTIFICATION_TYPE.ALL
  })
    type: NOTIFICATION_TYPE

  @Field(of => [NOTIFICATION_ACTION], {
    description: '按action获取通知',
    nullable: true,
    defaultValue: [
      NOTIFICATION_ACTION.ADD_COMMENT_ON_POST,
      NOTIFICATION_ACTION.ADD_COMMENT_ON_COMMENT,
      NOTIFICATION_ACTION.ADD_COMMENT_ON_USER
    ]
  })
    actions: NOTIFICATION_ACTION[]
}

@ArgsType()
export class UsersWithRelayFilter {
  @Field(of => String, { nullable: true })
    universityId: string
}

@ObjectType()
export class PrivateSettings {
  @Field(of => Boolean, { nullable: true, description: '校区是否公开' })
    isSubCampusPrivate: boolean

  @Field(of => Boolean, { nullable: true, description: '年级是否公开' })
    isGradePrivate: boolean

  @Field(of => Boolean, { nullable: true, description: '学校是否公开' })
    isUniversityPrivate: boolean

  @Field(of => Boolean, { nullable: true, description: '学院是否公开' })
    isInstitutePrivate: boolean

  @Field(of => Boolean, { nullable: true, description: '性别是否公开' })
    isGenderPrivate: boolean
}

@ArgsType()
export class UpdatePrivateSettingsArgs {
  @Field(of => Boolean, { nullable: true, description: '校区是否公开' })
    isSubCampusPrivate: boolean

  @Field(of => Boolean, { nullable: true, description: '年级是否公开' })
    isGradePrivate: boolean

  @Field(of => Boolean, { nullable: true, description: '学校是否公开' })
    isUniversityPrivate: boolean

  @Field(of => Boolean, { nullable: true, description: '学院是否公开' })
    isInstitutePrivate: boolean

  @Field(of => Boolean, { nullable: true, description: '性别是否公开' })
    isGenderPrivate: boolean
}
