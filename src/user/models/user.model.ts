import {
  ArgsType,
  createUnionType,
  Field,
  InputType,
  Int,
  InterfaceType,
  IntersectionType,
  ObjectType,
  registerEnumType
} from '@nestjs/graphql'

import { UserId } from 'src/db/model/db.model'

import { Admin } from '../../admin/models/admin.model'
import { Role } from '../../auth/model/auth.model'
import { Node } from '../../node/models/node.model'
import { NOTIFICATION_ACTION, NOTIFICATION_TYPE } from '../../notifications/models/notifications.model'

export enum ORDERBY {
  // 时间戳从大到小
  DESC = 'DESC',
  // 随机排列
  SHUFFLE = 'SHUFFLE',
  // 时间戳从小到大
  ASC = 'ASC'
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

@InputType()
export class UserStringPropMap {
  @Field({ description: '属性的值' })
    value: string

  @Field(type => Boolean, { description: '是否私有属性', nullable: true, defaultValue: false })
    isPrivate: boolean
}

@InputType()
export class UserGenderPropMap {
  @Field(of => GENDER, { description: '属性的值' })
    value: GENDER

  @Field(type => Boolean, { description: '是否私有属性', nullable: true, defaultValue: false })
    isPrivate: boolean
}

@ArgsType()
export class PersonLoginArgs {
  @Field({ description: '用户账号' })
    userId: string

  @Field({ description: '用户密码' })
    sign: string
}

@ArgsType()
export class UpdateUserArgs {
  @Field(of => UserStringPropMap, { description: '学院', nullable: true })
    college?: UserStringPropMap

  @Field(of => UserStringPropMap, { description: '校区', nullable: true })
    subCampus?: UserStringPropMap

  @Field({ description: '用户密码', nullable: true })
    sign?: RawSign

  @Field({ description: '用户昵称', nullable: true })
    name?: string

  @Field(of => UserGenderPropMap, { description: '用户性别', nullable: true })
    gender?: UserGenderPropMap

  @Field({ description: '用户头像链接', nullable: true })
    avatarImageUrl?: string

  @Field(of => UserStringPropMap, { description: '用户的学校', nullable: true })
    school?: UserStringPropMap

  @Field(of => UserStringPropMap, { description: '用户的年级', nullable: true })
    grade?: UserStringPropMap
}

@ArgsType()
export class RegisterUserArgs {
  @Field({ description: '用户名', nullable: true })
    userId?: string | null

  @Field({ description: '用户昵称' })
    name: string

  @Field({ description: '用户密码' })
    sign: string

  @Field({ description: 'code', nullable: true })
    code?: string | null
}

@ArgsType()
export class CreateUserArgs {
  @Field(of => Int, { description: '学号', nullable: true })
    studentId?: number

  @Field(of => UserStringPropMap, { description: '学院' })
    college: UserStringPropMap

  @Field(of => UserStringPropMap, { description: '校区' })
    subCampus: UserStringPropMap

  @Field({ description: '用户账号' })
    userId: UserId

  @Field({ description: '用户密码' })
    sign: RawSign

  @Field({ nullable: true, description: '微信login code' })
    code?: string

  @Field({ description: '用户昵称' })
    name: string

  @Field(of => UserGenderPropMap, { description: '用户性别' })
    gender: UserGenderPropMap

  @Field({ description: '用户头像链接' })
    avatarImageUrl: string

  @Field(of => UserStringPropMap, { description: '学校' })
    school: UserStringPropMap

  @Field(of => UserStringPropMap, { description: '年级' })
    grade: UserStringPropMap
}

export type RawSign = string

@ObjectType({
  implements: () => [Person, Node]
})
export class User implements Person, Node {
  constructor (user: User) {
    Object.assign(this, user)
  }

  @Field({ description: 'id 自动生成' })
    id: string

  @Field(of => Int, { description: '学号', nullable: true })
    studentId?: number | null

  @Field({ description: '用户昵称' })
    name: string

  @Field({ description: '用户账号' })
    userId: UserId

  @Field({ description: '微信openId,注册时传入微信code自动通过微信提供的接口获取获取' })
    openId: string

  @Field({ description: '微信unionId,注册时传入微信code自动通过微信提供的接口获取获取' })
    unionId: string

  @Field(of => GENDER, { nullable: true, description: '用户性别' })
    gender?: GENDER | null

  @Field({ description: '学院', nullable: true })
    college?: string | null

  @Field({ description: '校区', nullable: true })
    subCampus?: string | null

  @Field({ description: '学校', nullable: true })
    school?: string | null

  @Field({ description: '年级', nullable: true })
    grade?: string | null

  @Field({ description: '用户创建时间' })
    createdAt: string

  @Field({ description: '用户信息的更新时间' })
    updatedAt: string

  @Field({ description: '用户上一次调用login接口获取token的系统时间' })
    lastLoginedAt: string

  @Field({ description: '用户头像链接', nullable: true })
    avatarImageUrl?: string | null
}

@ObjectType()
export class UserPrivateProps {
  @Field(of => Boolean, { description: '学院属性是否私有', nullable: true, defaultValue: false })
    isCollegePrivate: boolean

  @Field(of => Boolean, { description: '校区属性是否私有', nullable: true, defaultValue: false })
    isSubCampusPrivate: boolean

  @Field(of => Boolean, { description: '性别属性是否私有', nullable: true, defaultValue: false })
    isGenderPrivate: boolean

  @Field(of => Boolean, { description: '学校属性是否私有', nullable: true, defaultValue: false })
    isSchoolPrivate: boolean

  @Field(of => Boolean, { description: '年级属性是否私有', nullable: true, defaultValue: false })
    isGradePrivate: boolean
}

@ObjectType({
  implements: () => [Person, Node],
  description: '包含属性是否个人可见的用户对象'
})
export class UserWithPrivateProps extends IntersectionType(UserPrivateProps, User) implements Person, Node {
  constructor (userWithPrivateProps: UserWithPrivateProps) {
    super(userWithPrivateProps)
    Object.assign(this, userWithPrivateProps)
  }
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

@ObjectType()
export class UsersConnection {
  @Field(type => [User])
    nodes: User[]

  @Field(type => Int)
    totalCount: number
}

@ArgsType()
export class PagingConfigArgs {
  @Field(type => Int, { nullable: true, defaultValue: 10 })
    first: number

  @Field(type => Int, { nullable: true, defaultValue: 0 })
    offset: number
}

export type CheckUserResult = User & {success: boolean, roles: Role[]}
export const AdminAndUserWithPrivatePropsUnion = createUnionType({
  name: 'AdminAndUserWithPrivatePropsUnion',
  types: () => [UserWithPrivateProps, Admin]
})

export const AdminAndUserUnion = createUnionType({
  name: 'AdminAndUserUnion',
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
  @Field(of => NOTIFICATION_TYPE, { description: '获取', nullable: true, defaultValue: NOTIFICATION_TYPE.ALL })
    type: NOTIFICATION_TYPE

  @Field(of => [NOTIFICATION_ACTION], { description: '按action获取通知', nullable: true, defaultValue: [NOTIFICATION_ACTION.ADD_COMMENT_ON_POST, NOTIFICATION_ACTION.ADD_COMMENT_ON_COMMENT] })
    actions: NOTIFICATION_ACTION[]
}
