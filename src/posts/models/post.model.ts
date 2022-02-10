import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql'

import { PageInfo } from '../../node/models/node.model'

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

@ObjectType()
export class Edge {
  constructor (edge: Edge) {
    Object.assign(this, edge)
  }

  @Field(of => Post)
    node: Post

  @Field()
    cursor: string
}

@ArgsType()
export class RelayPagingConfigArgs {
  @Field(of => Int, { description: '最新的n个对象', nullable: true })
    first?: number

  @Field(of => String, { description: '向前分页游标', nullable: true })
    after?: string

  @Field(of => Int, { description: '最早的n个对象', nullable: true })
    last?: number

  @Field(of => String, { description: '向后分页游标', nullable: true })
    before?: string
}

@ObjectType()
export class PostsConnectionWithRelay {
  @Field(of => Int, { description: '对象总数' })
    totalCount: number

  @Field(of => PageInfo)
    pageInfo: PageInfo

  @Field(of => [Edge])
    edges: Edge[]
}
