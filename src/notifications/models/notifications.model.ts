import { Field, ObjectType, registerEnumType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

export enum NOTIFICATION_ACTION {
  ADD_COMMENT_ON_POST = 'ADD_COMMENT_ON_POST',
  ADD_COMMENT_ON_COMMENT = 'ADD_COMMENT_ON_COMMENT'
}

registerEnumType(NOTIFICATION_ACTION, {
  name: 'NOTIFICATION_ACTION'
})

@ObjectType()
export class Notification {
  @Field({ description: '通知的id' })
    id: string

  @Field({ description: '通知的创建时间' })
    createdAt: string

  @Field(of => NOTIFICATION_ACTION, { description: '通知涉及的操作' })
    action: NOTIFICATION_ACTION

  @Field(of => Boolean, { description: '当前通知是否已被通知接收者设置为已读状态' })
    isRead: boolean
}

@ObjectType()
export class NotificationsConnection extends Connection<Notification>(Notification) {}
