import { Field, InputType, ObjectType } from '@nestjs/graphql'

export type SubjectId = string

@InputType()
export class SubjectBase {
  @Field()
    title: string

  @Field()
    subscription: string

  @Field()
    avatarUrl: string

  @Field()
    background: string
}

@ObjectType()
export class Subject {
  @Field()
    id: SubjectId

  @Field()
    createAt: string

  @Field()
    title: string

  @Field()
    subscription: string

  @Field()
    avatarUrl: string

  @Field()
    background: string
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
