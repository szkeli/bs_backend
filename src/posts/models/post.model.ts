import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'

import { SubjectId } from 'src/subject/model/subject.model'

@ObjectType()
export class Post {
  constructor (post: Post) {
    Object.assign(this, post)
  }

  @Field()
    id?: string

  @Field()
    title: string

  @Field()
    content: string

  @Field()
    createdAt: string

  @Field(type => [String])
    images: [string]
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

@ObjectType()
export class PostsConnection {
  // @Field(type => [PostEdge])
  //   edges: [PostEdge]

  // @Field(type => PageInfo)
  //   pageInfo: PageInfo

  @Field(type => [Post])
    nodes: [Post?]

  @Field(type => Int)
    totalCount: number
}

@ObjectType()
export class PostEdge {
  @Field(type => String)
    cursor: string

  @Field(type => Post)
    node: Post
}
