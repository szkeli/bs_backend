import { ArgsType, Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

import { Connection, ORDER_BY } from '../../connections/models/connections.model'

export enum POST_FILTER_ENUM {
  BASE_ON_UNIVERSITY_OF_CURRENT_USER = 'BASE_ON_UNIVERSITY_OF_CURRENT_USER',
  BASE_ON_UNIVERSITY_ID = 'BASE_ON_UNIVERSITY_ID'
}

registerEnumType(POST_FILTER_ENUM, {
  name: 'POST_FILTER_ENUM',
  valuesMap: {
    BASE_ON_UNIVERSITY_OF_CURRENT_USER: {
      description: '自动从当前用户所在的大学获取帖子，当前用户的 universities 为 null 时，返回的 Post 也是 null'
    },
    BASE_ON_UNIVERSITY_ID: {
      description: '从某一个大学获取帖子'
    }
  }
})

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
export class PostFilter {
  @Field(of => POST_FILTER_ENUM, { defaultValue: POST_FILTER_ENUM.BASE_ON_UNIVERSITY_OF_CURRENT_USER })
    filterEnum: POST_FILTER_ENUM

  @Field(of => String, { description: '与 filterEnum 联合使用，实现从某个大学获取帖子' })
    universityId: string
}

@ObjectType()
export class PostsConnectionWithRelay extends Connection<Post>(Post) {}
