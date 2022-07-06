import { ArgsType, Field, ObjectType, registerEnumType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

export enum DEADLINE_TYPE {
  AUTO_IMPORT = 'AUTO_IMPORT',
  USER_CREATE = 'USER_CREATE',
}

registerEnumType(DEADLINE_TYPE, {
  name: 'DEADLINE_TYPE',
  description: 'deadline 的类型',
  valuesMap: {
    AUTO_IMPORT: {
      description: '从内部网导入'
    },
    USER_CREATE: {
      description: '用户创建'
    }
  }
})

@ObjectType({ description: 'Deadline对象' })
export class Deadline {
  @Field({ description: 'deadline 的唯一id' })
    id: string

  @Field({ description: '创建时间' })
    createdAt: string

  @Field({ description: 'deadline 的开始时间' })
    startDate: string

  @Field({ description: 'deadline 的结束时间' })
    endDate: string

  @Field({ description: 'deadline 对应的课程的名字' })
    courseName: string

  @Field({ description: 'deadline 的标题' })
    title: string

  @Field(of => DEADLINE_TYPE, { description: 'deadline 的类型' })
    type: DEADLINE_TYPE
}

@ArgsType()
export class AddDealineArgs {
  @Field(of => String, { description: 'deadline 对应的课程的 id', nullable: true })
    lessonId?: string | null

  @Field(of => String, { description: '唯一的 deadline id' })
    deadlineId: string

  @Field(of => String, { description: 'deadline 对应的课程的名字' })
    courseName: string

  @Field(of => String, { description: 'deadline 的开始时间' })
    startDate: string

  @Field(of => String, { description: 'deadline 的结束时间' })
    endDate: string

  @Field(of => String, { description: 'deadline 的标题' })
    title: string

  @Field(of => DEADLINE_TYPE, { description: 'deadline 的类型' })
    type: DEADLINE_TYPE
}

@ObjectType()
export class DeadlinesConnection extends Connection<Deadline>(Deadline) {}
