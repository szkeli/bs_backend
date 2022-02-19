import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

export type SubjectId = string

@ArgsType()
export class CreateSubjectArgs {
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
export class SubjectsConnection {
  @Field(type => [Subject])
    nodes: Subject[]

  @Field(type => Int)
    totalCount: number
}

@ObjectType()
export class SubjectsConnectionWithRelay extends Connection<Subject>(Subject) {}
