import { ArgsType, Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class SubField {
  @Field(of => String)
    id: string

  @Field(of => String)
    title: string

  @Field(of => String)
    avatarImageUrl: string
}

@ArgsType()
export class CreateSubFieldArgs {
  @Field(of => String, { description: '指定 Subject' })
    subjectId: string

  @Field(of => String)
    title: string

  @Field(of => String)
    avatarImageUrl: string
}
