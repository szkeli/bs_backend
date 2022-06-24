import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

export enum ExperienceTransactionType {
  MINT = 'MINT',
  BURN = 'BURN',
  DAILY_CHECK_IN = 'DAILY_CHECK_IN'
}

registerEnumType(ExperienceTransactionType, {
  name: 'ExperienceTransactionType',
  valuesMap: {
    MINT: {
      description: '无条件铸造'
    },
    BURN: {
      description: '无条件烧毁'
    },
    DAILY_CHECK_IN: {
      description: '每日登录的奖励'
    }
  }
})

@ObjectType()
export class Experience {
  @Field()
    id: string

  @Field(of => Int, { nullable: false })
    points: number

  @Field(of => ExperienceTransactionType, { nullable: false })
    transactionType: ExperienceTransactionType
}

@ObjectType()
export class ExperiencesConnection extends Connection<Experience>(Experience) {}
