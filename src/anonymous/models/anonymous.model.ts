import { Field, ObjectType } from '@nestjs/graphql'

import { SubCampus } from '../../subcampus/models/subcampus.model'

@ObjectType()
export class Anonymous {
  @Field(of => String)
    id: string

  @Field(of => String, { nullable: true })
    createdAt: string

  @Field(of => String, { description: '同一个用户的匿名信息在同一条帖子下面的 watermark 相同' })
    watermark: string

  @Field(of => SubCampus, { description: '匿名用户的校区', nullable: true })
    subCampus?: SubCampus | null
}
