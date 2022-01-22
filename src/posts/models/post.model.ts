import { ArgsType, Field, InputType, Int, ObjectType } from '@nestjs/graphql'

import { SubjectId } from 'src/subject/model/subject.model'

@ArgsType()
export class CreatePostArgs {
  @Field({ description: '帖子标题' })
    title: string

  @Field({ description: '帖子内容' })
    content: string

  @Field(type => [String], { description: '帖子图片', nullable: true })
    images: [string]

  @Field({ nullable: true, description: '帖子所属的主题' })
    subjectId: string
}

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

export class PostWithCreatorId extends Post {
  creatorId: string
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
    nodes: Post[]

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
