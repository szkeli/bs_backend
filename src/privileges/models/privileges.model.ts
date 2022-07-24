import { ArgsType, Field, ObjectType, registerEnumType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

export enum IPRIVILEGE {
  ROOT = 'ROOT',
  // 能够认证其他管理员
  ADMIN_CAN_AUTHEN_OTHER = 'ADMIN_CAN_AUTHEN_OTHER',
  // 能够认证并创建管理员
  ADMIN_CAN_CREATE_ADMIN = 'ADMIN_CAN_CREATE_ADMIN',
  // 能删除Admin
  ADMIN_CAN_DELETE_ADMIN = 'ADMIN_CAN_DELETE_ADMIN',
  // 能删除User
  ADMIN_CAN_DELETE_USER = 'ADMIN_CAN_DELETE_USER',
  // 能创建User
  ADMIN_CAN_CREATE_USER = 'ADMIN_CAN_CREATE_USER',
  // 能更新User
  ADMIN_CAN_UPDATE_USER = 'ADMIN_CAN_UPDATE_USER',
  // 能通过一个举报
  ADMIN_CAN_ACCEPT_REPORT = 'ADMIN_CAN_ACCEPT_REPORT',
  // 能拒绝一个举报
  ADMIN_CAN_REJECT_REPORT = 'ADMIN_CAN_REJECT_REPORT',
  // 能查看全局状态数据数据 (某时间段内的注册数，点赞数，发帖数)
  ADMIN_CAN_VIEW_STATE = 'ADMIN_CAN_VIEW_STATE',
  // 管理员能删除一个主题
  ADMIN_CAN_DELETE_SUBJECT = 'ADMIN_CAN_DELETE_SUBJECT',
  // 管理员能置顶一个帖子
  ADMIN_CAN_ADD_PIN_ON_POST = 'ADMIN_CAN_ADD_PIN_ON_POST',
  // 管理员能取消一个帖子的置顶
  ADMIN_CAN_REMOVE_PIN_ON_POST = 'ADMIN_CAN_REMOVE_PIN_ON_POST',
  // 管理员能够认证用户
  ADMIN_CAN_AUTHEN_USER = 'ADMIN_CAN_AUTHEN_USER',
  // 管理员能够拉黑一个用户
  ADMIN_CAN_ADD_BLOCK_ON_USER = 'ADMIN_CAN_ADD_BLOCK_ON_USER',
  // 管理员能够解除拉黑一个用户
  ADMIN_CAN_REMOVE_BLOCK_ON_USER = 'ADMIN_CAN_REMOVE_BLOCK_ON_USER',
  // 管理员能够折叠一条评论
  ADMIN_CAN_ADD_FOLD_ON_COMMENT = 'ADMIN_CAN_ADD_FOLD_ON_COMMENT',
  // 管理员能创建一个主题
  ADMIN_CAN_CREATE_SUBJECT = 'ADMIN_CAN_CREATE_SUBJECT',
  // 用户能创建主题
  USER_CAN_CREATE_SUBJECT = 'USER_CAN_CREATE_SUBJECT'
}

registerEnumType(IPRIVILEGE, {
  name: 'IPRIVILEGE',
  description: '全局权限值',
  valuesMap: {
    ADMIN_CAN_ACCEPT_REPORT: {
      description: '管理员能通过一个举报'
    },
    ADMIN_CAN_CREATE_ADMIN: {
      description: '管理员能创建一个新的管理员'
    },
    USER_CAN_CREATE_SUBJECT: {
      description: '用户能创建一个新的主题'
    },
    ADMIN_CAN_VIEW_STATE: {
      description: '管理员能查看全局数据(某段时间内的注册数，点赞数，发帖数)'
    }
  }
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
export class AddPrivilegeOnUserArgs {
  @Field(of => IPRIVILEGE)
    privilege: IPRIVILEGE

  @Field(of => String)
    id: string
}

@ArgsType()
export class RemovePrivilegeArgs {
  @Field(type => IPRIVILEGE)
    privilege: IPRIVILEGE

  @Field(type => String)
    from: string
}

@ObjectType()
export class PrivilegesConnection extends Connection<Privilege>(Privilege) {}
