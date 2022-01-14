import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'

export type SubjectId = string

@InputType()
export class SubjectBase {
  @Field()
    title: string

  @Field()
    subscription: string

  @Field()
    avatarImageUrl: string

  @Field()
    backgroundImageUrl: string
}

@ObjectType()
export class Subject {
  @Field()
    id: SubjectId

  @Field()
    createdAt: string

  @Field()
    title: string

  @Field()
    subscription: string

  @Field()
    avatarImageUrl: string

  @Field()
    backgroundImageUrl: string
}

@InputType()
export class CreateSubjectInput extends SubjectBase {}

@InputType()
export class UpdateSubjectInput {
  @Field()
    id: SubjectId

  @Field({ nullable: true })
    title?: string

  @Field({ nullable: true })
    subscription?: string

  @Field({ nullable: true })
    avatarUrl?: string

  @Field({ nullable: true })
    background?: string
}

@ObjectType()
export class SubjectsConnection {
  // @Field(type => [SubjectEdge])
  //   edges: [SubjectEdge]

  // @Field(type => PageInfo)
  //   pageInfo: PageInfo

  @Field(type => [Subject])
    nodes: [Subject]

  @Field(type => Int)
    totalCount: number
}

@ObjectType()
export class SubjectEdge {
  @Field(type => String)
    cursor: string

  @Field(type => Subject)
    node: Subject
}
