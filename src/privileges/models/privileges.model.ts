import { ArgsType, Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

export enum IPRIVILEGE {
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

registerEnumType(IPRIVILEGE, {
  name: 'IPRIVILEGE'
})

@ObjectType()
export class Privilege {
  @Field()
    id: string

  @Field()
    createdAt: string

  @Field(type => IPRIVILEGE)
    value: IPRIVILEGE
  // creator
  // to
}

@ArgsType()
export class AddPrivilegeOnAdmin {
  @Field(type => IPRIVILEGE)
    privilege: IPRIVILEGE

  @Field(type => String)
    adminId: string
}

@ObjectType()
export class PrivilegesConnection {
  @Field(type => [Privilege])
    nodes: Privilege[]

  @Field(type => Int)
    totalCount: number
}
