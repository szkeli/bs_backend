import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql'

import { Connection, ORDER_BY } from '../../connections/models/connections.model'

@ObjectType()
export class IImage {
  @Field()
    id: string

  @Field()
    value: string

  @Field(of => Int, { description: '图片顺序' })
    index: number
}

export type Nullable<T> = T | null

@ArgsType()
export class CreatePostArgs {
  @Field({ description: '帖子内容' })
    content: string

  @Field(type => [String], { description: '帖子图片', nullable: true })
    images: string[]

  @Field({ nullable: true, description: '帖子所属的 Subject' })
    subjectId: string

  @Field({ description: '帖子所在的 University' })
    universityId: string

  @Field(type => Boolean, { nullable: true, description: '是否匿名帖子', defaultValue: false })
    isAnonymous: boolean
}

@ObjectType()
export class Post {
  constructor (post: Post) {
    Object.assign(this, post)
  }

  @Field(of => String)
    id: string

  @Field()
    content: string

  @Field()
    createdAt: string
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

@ArgsType()
export class RelayPagingConfigArgs {
  @Field(of => Int, { description: '最新的n个对象', nullable: true, defaultValue: 10 })
    first?: number

  @Field(of => String, { description: '向前分页游标', nullable: true })
    after?: string

  @Field(of => Int, { description: '最早的n个对象', nullable: true })
    last?: number

  @Field(of => String, { description: '向后分页游标', nullable: true })
    before?: string

  @Field(of => ORDER_BY, { description: '排序方式', nullable: true, defaultValue: ORDER_BY.CREATED_AT_DESC })
    orderBy?: ORDER_BY
}

@ArgsType()
export class QueryPostsFilter {
  @Field(of => String, { nullable: true })
    universityId: string
}

@ObjectType()
export class PostsConnectionWithRelay extends Connection<Post>(Post) {}
