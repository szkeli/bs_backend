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
  CAN_CREATE_USER = 'CAN_CREATE_USER',
  // 能更新User
  CAN_UPDATE_USER = 'CAN_UPDATE_USER',
  // 能通过一个举报
  CAN_ACCEPT_REPORT = 'CAN_ACCEPT_REPORT',
  // 能拒绝一个举报
  CAN_REJECT_REPORT = 'CAN_REJECT_REPORT',
  // 能查看全局状态数据数据 (某时间段内的注册数，点赞数，发帖数)
  CAN_VIEW_STATE = 'CAN_VIEW_STATE'
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
}

@ArgsType()
export class AddPrivilegeOnAdmin {
  @Field(type => IPRIVILEGE)
    privilege: IPRIVILEGE

  @Field(type => String)
    adminId: string
}

@ArgsType()
export class RemovePrivilegeOnAdmin {
  @Field(type => IPRIVILEGE)
    privilege: IPRIVILEGE

  @Field(type => String)
    from: string
}

@ObjectType()
export class PrivilegesConnection {
  @Field(type => [Privilege])
    nodes: Privilege[]

  @Field(type => Int)
    totalCount: number
}
