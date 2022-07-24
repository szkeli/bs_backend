import { ArgsType, Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

export enum ExperienceTransactionType {
  MINT = 'MINT',
  BURN = 'BURN',
  DAILY_CHECK_IN = 'DAILY_CHECK_IN',
  FROM_SZTU = 'FROM_SZTU'
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
    },
    FROM_SZTU: {
      description: 'mint from sztu'
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

  @Field(of => String)
    createdAt: string
}

@ObjectType()
export class ExperiencesConnection extends Connection<Experience>(Experience) {}

@ArgsType()
export class MintForSZTUArgs {
  @Field(of => String, { description: '将对象 {points: S, uid: U} 使用 JSON.stringify 序列化然后使用指定的 key 制作 jwt，其中 S 是自然数，U是待领取经验的用户的 id，用于防止重放攻击' })
    payload: string
}
