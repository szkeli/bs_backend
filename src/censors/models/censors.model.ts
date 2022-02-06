import { Field, ObjectType } from '@nestjs/graphql'

export enum CENSOR_SUGGESTION {
  BLOCK = 'block',
  REVIEW = 'review',
  PASS = 'pass'
}

@ObjectType()
export class CensorDetail {
  @Field(of => [String], { description: '违禁品', nullable: true })
    contraband?: string[]

  @Field(of => [String], { description: '广告', nullable: true })
    ad?: string[]

  @Field(of => [String], { description: '辱骂', nullable: true })
    abuse?: string[]

  @Field(of => [String], { description: '涉黄', nullable: true })
    porn?: string[]

  @Field(of => [String], { description: '涉政', nullable: true })
    politics?: string[]
}

@ObjectType()
export class CensorResponse {
  @Field({ description: 'block: 建议直接拉黑; review: 建议人工复查; pass: 建议直接发布;' })
    suggestion: string

  @Field(of => CensorDetail, { description: '详情' })
    detail: CensorDetail
}
