import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql'

export type Nullable<T> = T | null
@ArgsType()
export class CreatePostArgs {
  @Field({ description: '帖子内容' })
    content: string

  @Field(type => [String], { description: '帖子图片', nullable: true })
    images: string[]

  @Field({ nullable: true, description: '帖子所属的主题' })
    subjectId: string

  @Field(type => Boolean, { nullable: true, description: '是否匿名帖子', defaultValue: false })
    isAnonymous: boolean
}

@ObjectType()
export class Post {
  constructor (post: Post) {
    Object.assign(this, post)
  }

  @Field()
    id?: string

  @Field()
    content: string

  @Field()
    createdAt: string

  @Field(type => [String], { nullable: true })
    images: string[]
}

export class PostWithCreatorId extends Post {
  creatorId: string
}

@ObjectType()
export class PostsConnection {
  @Field(type => [Post])
    nodes: Post[]

  @Field(type => Int)
    totalCount: number
}
