import { ArgsType, Field, ObjectType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

@ObjectType()
export class University {
  @Field({ description: '大学的唯一id' })
    id: string

  @Field({ description: '该大学的名字' })
    name: string

  @Field({ description: '该大学的 logo' })
    logoUrl: string

  @Field()
    createdAt: string
}

@ArgsType()
export class CreateUniversityArgs {
  @Field({ description: '大学的名字' })
    name: string

  @Field({ description: '大学的 logo' })
    logoUrl: string
}

@ObjectType()
export class UniversitiesConnection extends Connection<University>(University) {}

@ArgsType()
export class UpdateUniversityArgs {
  @Field()
    id: string

  @Field({ nullable: true })
    name?: string

  @Field({ nullable: true })
    logoUrl?: string
}

@ArgsType()
export class DeleteUniversityArgs {
  @Field()
    id: string

  @Field({ description: '为何删除它', nullable: true })
    description: string
}

export interface FindUniversityByIdOrNameArgs {
  universityId?: string | null
  universityName?: string | null
}

@ArgsType()
export class FindUniversityArgs {
  @Field(of => String, { nullable: true, description: 'Subject 所在的大学的 id' })
    universityId: string | null

  @Field(of => String, { nullable: true, description: 'Post 所属的 University, 支持模糊匹配，匹配结果大于1时报错' })
    universityName: string | null
}
