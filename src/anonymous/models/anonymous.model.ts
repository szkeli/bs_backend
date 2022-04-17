import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class Anonymous {
  @Field()
    id: string

  @Field()
    createdAt: string

  @Field({ description: '同一个用户的匿名信息在同一条帖子下面的 watermark 相同' })
    watermark: string

  @Field({ description: '匿名时的校区', nullable: true })
    subCampus?: string | null
}
