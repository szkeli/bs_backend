import {
  ArgsType,
  createUnionType,
  Field,
  Int,
  InterfaceType,
  ObjectType,
  registerEnumType
} from '@nestjs/graphql'

import { UserId } from 'src/db/model/db.model'

import { Admin } from '../../admin/models/admin.model'
import { Role } from '../../auth/model/auth.model'
import { Node } from '../../node/models/node.model'

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

@ArgsType()
export class PersonLoginArgs {
  @Field({ description: '用户账号' })
    userId: string

  @Field({ description: '用户密码' })
    sign: string
}
@ArgsType()
export class UpdateUserArgs {
  @Field({ description: '学院', nullable: true })
    college?: string

  @Field({ description: '校区', nullable: true })
    subCampus?: string

  @Field({ description: '用户密码', nullable: true })
    sign?: RawSign

  @Field({ description: '用户昵称', nullable: true })
    name?: string

  @Field(type => GENDER, { description: '用户性别', nullable: true })
    gender?: GENDER

  @Field({ description: '用户头像链接', nullable: true })
    avatarImageUrl?: string

  @Field({ description: '用户的学校', nullable: true })
    school?: string

  @Field({ description: '用户年级', nullable: true })
    grade?: string
}

@ArgsType()
export class CreateUserArgs {
  @Field(type => Int, { description: '学号', nullable: true })
    studentId?: number

  @Field({ description: '学院' })
    college: string

  @Field({ description: '校区' })
    subCampus: string

  @Field({ description: '用户账号' })
    userId: UserId

  @Field({ description: '用户密码' })
    sign: RawSign

  @Field({ nullable: true, description: '微信login code' })
    code?: string

  @Field({ description: '用户昵称' })
    name: string

  @Field(type => GENDER, { description: '用户性别' })
    gender: GENDER

  @Field({ description: '用户头像链接' })
    avatarImageUrl: string

  @Field({ description: '学校' })
    school: string

  @Field({ description: '年级' })
    grade: string
}

export type RawSign = string

@ObjectType({
  implements: () => [Person, Node]
})
export class User implements Person, Node {
  constructor (user: User) {
    Object.assign(this, user)
  }

  @Field(type => Int, { description: '学号', nullable: true })
    studentId?: number

  @Field({ description: '学院', nullable: true })
    college?: string

  @Field({ description: '校区', nullable: true })
    subCampus?: string

  @Field({ description: 'id 自动生成' })
    id: string

  @Field({ description: '用户昵称' })
    name: string

  @Field({ description: '用户账号' })
    userId: UserId

  @Field({ description: '微信openId,注册时传入微信code自动通过微信提供的接口获取获取' })
    openId: string

  @Field({ description: '微信unionId,注册时传入微信code自动通过微信提供的接口获取获取' })
    unionId: string

  @Field(type => GENDER, { defaultValue: GENDER.NONE, description: '用户性别' })
    gender: GENDER

  @Field({ description: '用户创建时间' })
    createdAt: string

  @Field({ description: '用户信息的更新时间' })
    updatedAt: string

  @Field({ description: '用户上一次调用login接口获取token的时间' })
    lastLoginedAt: string

  @Field({ description: '用户头像链接' })
    avatarImageUrl: string

  @Field({ description: '学校' })
    school: string

  @Field({ description: '年级' })
    grade: string
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
export class PageInfo {
  @Field()
    endCursor: string

  @Field(type => Boolean)
    hasNextPage: boolean

  @Field(type => Boolean)
    hasPreviousPage: boolean

  @Field(type => String)
    startCursor: string
}

@ObjectType()
export class UsersConnection {
  // @Field(type => [UserEdge])
  //   edges: [UserEdge]

  // @Field(type => PageInfo)
  //   pageInfo: PageInfo

  @Field(type => [User])
    nodes: [User?]

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
