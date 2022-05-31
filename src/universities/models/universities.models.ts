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
