import { ArgsType, Field, ObjectType, PartialType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'
import { FindUniversityArgs } from '../../universities/models/universities.models'

export type SubjectId = string

@ArgsType()
export class CreateSubjectArgs extends PartialType(FindUniversityArgs) {
  @Field()
    title: string

  @Field()
    description: string

  @Field()
    avatarImageUrl: string

  @Field()
    backgroundImageUrl: string
}

@ObjectType()
export class Subject {
  constructor (subject: Subject) {
    Object.assign(this, subject)
  }

  @Field()
    id: SubjectId

  @Field()
    createdAt: string

  @Field()
    title: string

  @Field()
    description: string

  @Field()
    avatarImageUrl: string

  @Field()
    backgroundImageUrl: string
}

@ArgsType()
export class UpdateSubjectArgs {
  @Field()
    id: string

  @Field({ nullable: true })
    title?: string

  @Field({ nullable: true })
    description?: string

  @Field({ nullable: true })
    avatarImageUrl?: string

  @Field({ nullable: true })
    backgroundImageUrl?: string
}

@ObjectType()
export class SubjectsConnection extends Connection<Subject>(Subject) {}

@ObjectType()
export class SubjectsConnectionWithRelay extends Connection<Subject>(Subject) {}

@ArgsType()
export class QuerySubjectsFilter {
  @Field({ nullable: true })
    universityId: string
}
