import { ArgsType, Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

export enum DEADLINE_EVENT_TYPE {
  OVERDUE= 'OVERDUE',
  DUE='DUE'
}

registerEnumType(DEADLINE_EVENT_TYPE, {
  name: 'DEADLINE_EVENT_TYPE'
})
export enum DEADLINE_RECIPIENT_TYPE {
  RECEIVER = 'RECEIVER'
}

registerEnumType(DEADLINE_RECIPIENT_TYPE, {
  name: 'DEADLINE_RECIPIENT_TYPE'
})
export enum DEADLINE_SOURCE_DATA_TYPE {
  BLACKBOARD_PLATFORM_GRADEBOOK2_GRADABLEITEM = 'blackboard.platform.gradebook2.GradablItem'
}
registerEnumType(DEADLINE_SOURCE_DATA_TYPE, {
  name: 'DEADLINE_SOURCE_DATA_TYPE'
})
export enum DEADLINE_SOURCE_TYPE {
  AS = 'AS'
}
registerEnumType(DEADLINE_SOURCE_TYPE, {
  name: 'DEADLINE_SOURCE_TYPE'
})
export enum DEADLINE_TYPE {
  SCHEDULED = 'SCHEDULED'
}
registerEnumType(DEADLINE_TYPE, {
  name: 'DEADLINE_TYPE'
})

@ObjectType({ description: 'Deadline对象' })
export class Deadline {
  @Field()
    id: string

  @Field({ description: '创建时间' })
    createdAt: string

  @Field(type => Int)
    courseContentId: number

  @Field(type => Int)
    courseId: number

  @Field(type => Int)
    ownerUserId: number

  @Field(type => [Int])
    notificationIds: number[]

  @Field()
    parentId: string

  @Field()
    sourceId: string

  @Field()
    courseName: string

  @Field(type => Boolean)
    dataPending: boolean

  @Field()
    dateAdded: string

  @Field()
    startDate: string

  @Field({ nullable: true })
    endDate: string

  @Field()
    dueDate: string

  @Field(type => DEADLINE_EVENT_TYPE)
    eventType: DEADLINE_EVENT_TYPE

  @Field({ nullable: true })
    eventUrl: string

  @Field(type => Int)
    groupCount: number

  @Field()
    ownerName: string

  @Field(type => Int)
    receiverCount: number

  @Field(type => Int)
    recipientCount: number

  @Field(type => Int)
    recipientId: number

  @Field(type => DEADLINE_RECIPIENT_TYPE)
    recipientType: DEADLINE_RECIPIENT_TYPE

  @Field(type => Boolean)
    seen: boolean

  @Field({ nullable: true })
    sourceData: string

  @Field(type => DEADLINE_SOURCE_DATA_TYPE)
    sourceDataType: DEADLINE_SOURCE_DATA_TYPE

  @Field(type => DEADLINE_SOURCE_TYPE)
    sourceType: DEADLINE_SOURCE_TYPE

  @Field()
    title: string

  @Field(type => DEADLINE_TYPE)
    type: DEADLINE_TYPE

  @Field(type => Int)
    viewId: number
}

@ArgsType()
export class AddDealineArgs {
  @Field(type => Int)
    courseContentId: number

  @Field(type => Int)
    courseId: number

  @Field(type => Int)
    ownerUserId: number

  @Field(type => [Int])
    notificationIds: number[]

  @Field()
    parentId: string

  @Field()
    sourceId: string

  @Field()
    courseName: string

  @Field(type => Boolean)
    dataPending: boolean

  @Field()
    dateAdded: string

  @Field()
    startDate: string

  @Field({ nullable: true })
    endDate: string

  @Field()
    dueDate: string

  @Field(type => DEADLINE_EVENT_TYPE)
    eventType: DEADLINE_EVENT_TYPE

  @Field({ nullable: true })
    eventUrl: string

  @Field(type => Int)
    groupCount: number

  @Field()
    ownerName: string

  @Field(type => Int)
    receiverCount: number

  @Field(type => Int)
    recipientCount: number

  @Field(type => Int)
    recipientId: number

  @Field(type => DEADLINE_RECIPIENT_TYPE)
    recipientType: DEADLINE_RECIPIENT_TYPE

  @Field(type => Boolean)
    seen: boolean

  @Field({ nullable: true })
    sourceData: string

  @Field(type => DEADLINE_SOURCE_DATA_TYPE)
    sourceDataType: DEADLINE_SOURCE_DATA_TYPE

  @Field(type => DEADLINE_SOURCE_TYPE)
    sourceType: DEADLINE_SOURCE_TYPE

  @Field()
    title: string

  @Field(type => DEADLINE_TYPE)
    type: DEADLINE_TYPE

  @Field(type => Int)
    viewId: number
}

@ObjectType()
export class DeadlinesConnection extends Connection<Deadline>(Deadline) {}
