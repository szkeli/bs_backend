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
import { SubjectId } from 'src/subject/model/subject.model'

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
  @Field({ description: '用户 userId，注意不是 id' })
    userId: string

  @Field()
    sign: string
}

@InputType()
export class UserCreateInput {
  @Field()
    openId: string

  @Field()
    unionId: string

  @Field()
    name: string

  @Field(type => GENDER)
    gender: GENDER

  @Field()
    avatarImageUrl: string

  @Field()
    school: string

  @Field()
    grade: string
}

@InputType()
export class UserRegisterInput extends UserCreateInput {
  @Field()
    userId: UserId

  @Field()
    sign: RawSign
}

export type RawSign = string

@ArgsType()
export class UserUpdateProfileInput {
  @Field({ nullable: true })
    name?: string

  @Field(type => GENDER, { nullable: true })
    gender?: GENDER

  @Field({ nullable: true })
    avatarUrl?: string

  @Field({ nullable: true })
    school?: string

  @Field({ nullable: true })
    grade?: string

  @Field({ nullable: true })
    sign?: string
}

export interface UserDataBaseType {
  userId: string
  sign: string
  name: string
  avatarImageUrl: string
  gender: GENDER
  school: string
  grade: string
  openId: string
  unionId: string
  createdAt: string
  updatedAt: string
  lastLoginedAt: string
  'dgraph.type': string
  uid?: string
}

@ObjectType({
  implements: () => [Person, Node]
})
export class User implements Person, Node {
  constructor (user: User) {
    Object.assign(this, user)
  }

  @Field()
    id: string

  @Field()
    name: string

  @Field()
    userId: UserId

  @Field()
    openId: string

  @Field()
    unionId: string

  @Field(type => GENDER, { defaultValue: GENDER.NONE })
    gender: GENDER

  @Field()
    createdAt: string

  @Field()
    updatedAt: string

  @Field()
    lastLoginedAt: string

  @Field()
    avatarImageUrl: string

  @Field()
    school: string

  @Field()
    grade: string
}

@ObjectType({
  implements: () => [Node]
})
export class LoginResult extends User implements Node {
  @Field()
    token: string
}

export interface UserFollowASubjectInput {
  from: UserId
  to: SubjectId
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
