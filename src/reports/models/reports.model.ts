import { ArgsType, createUnionType, Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

import { Comment } from '../../comment/models/comment.model'
import { Node } from '../../node/models/node.model'
import { Post } from '../../posts/models/post.model'
import { User } from '../../user/models/user.model'

export enum REPORT_STATE {
  // 未处理的举报
  OPEN = 'OPEN',
  // 处理中的举报
  PENDING = 'PENDING',
  // 处理完成的举报
  CLOSE = 'CLOSE'
}

registerEnumType(REPORT_STATE, {
  name: 'REPORT_STATE'
})

export enum REPORT_TYPE {
  // 性骚扰 下流的
  LEWD_HARASS = 'LEWD_HARASS',
  // 诈骗
  FRAUD = 'FRAUD',
  // 其它
  OTHER = 'OTHER'
}

registerEnumType(REPORT_TYPE, {
  name: 'REPORT_TYPE'
})

@ObjectType({
  implements: [Node]
})
export class Report implements Node {
  constructor (report: Report) {
    Object.assign(this, report)
  }

  @Field()
    id: string

  @Field()
    createdAt: string

  @Field(type => REPORT_TYPE)
    type: REPORT_TYPE

  @Field()
    description: string

  @Field(type => REPORT_STATE)
    state: REPORT_STATE
  // to: string
  // creator: string
}

@ArgsType()
export class AddReportToArgs {
  @Field(type => REPORT_TYPE, { description: '举报的类型，枚举值' })
    type: REPORT_TYPE

  @Field({ description: '举报的描述' })
    description: string

  @Field({ description: '被举报对象的id' })
    to: string
}

export const Report2Union = createUnionType({
  name: 'Report2Union',
  types: () => [User, Post, Comment]
})

@ObjectType()
export class ReportsConnection {
  @Field(type => [Report])
    nodes: Report[]

  @Field(type => Int)
    totalCount: number
}
