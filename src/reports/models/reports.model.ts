import { Field, ObjectType, registerEnumType } from '@nestjs/graphql'

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

@ObjectType()
export class Report {
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
