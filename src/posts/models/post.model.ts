import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'

import { SubjectId } from 'src/subject/model/subject.model'
import { UserPostsInput } from 'src/user/models/user.model'

@ObjectType()
export class Post {
  @Field()
    id?: string

  @Field()
    title: string

  @Field()
    content: string

  @Field()
    createAt: string

  @Field(type => Int)
    voteCount: number

  @Field(type => Int)
    commentCount: number
}

@InputType()
export class CreateAPostInput {
  @Field()
    title: string

  @Field()
    content: string

  @Field({ nullable: true })
    subject?: SubjectId
}

@InputType()
export class PostsCommentsInput extends UserPostsInput {}
