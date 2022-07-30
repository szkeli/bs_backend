import { ArgsType, Field, Int, ObjectType, PartialType } from '@nestjs/graphql'
import { Type } from 'class-transformer'
import { ValidateNested } from 'class-validator'

import { Connection, ORDER_BY } from '../../connections/models/connections.model'
import { CreateIdleItemOrderArgs, CreateTakeAwayOrderArgs, CreateTeamUpOrderArgs } from '../../orders/models/orders.model'
import { Creatable } from '../../person/models/creatable.model'
import { FindUniversityArgs } from '../../universities/models/universities.models'
import { Votable } from '../../votes/model/votes.model'

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
export class CreatePostArgs extends PartialType(FindUniversityArgs) {
  @Field({ description: '帖子内容' })
    content: string

  @Field(of => [String], { description: '帖子图片', nullable: true })
    images: string[]

  @Field(of => String, { nullable: true, description: '帖子所属的 Subject' })
    subjectId: string

  @Field(of => String, { nullable: true, description: '帖子所属的二级分类' })
    subFieldId: string

  @Field(of => Boolean, { nullable: true, description: '是否匿名帖子', defaultValue: false })
    isAnonymous: boolean

  @ValidateNested()
  @Type(of => CreateTakeAwayOrderArgs)
  @Field(of => CreateTakeAwayOrderArgs, { description: '创建带有 有偿订单 的帖子', nullable: true })
    takeAwayOrder: CreateTakeAwayOrderArgs

  @ValidateNested()
  @Type(of => CreateIdleItemOrderArgs)
  @Field(of => CreateIdleItemOrderArgs, { description: '創建帶有 閑置訂單 的帖子', nullable: true })
    idleItemOrder: CreateIdleItemOrderArgs

  @ValidateNested()
  @Type(of => CreateTeamUpOrderArgs)

  @Field(of => CreateTeamUpOrderArgs, { description: '創建帶有 組隊 訂單的帖子', nullable: true })
    teamUpOrder: CreateTeamUpOrderArgs
}

@ObjectType({
  implements: () => [Votable, Creatable]
})
export class Post implements Votable, Creatable {
  constructor (post: Post) {
    Object.assign(this, post)
  }

  @Field(of => String)
    id: string

  @Field(of => String)
    content: string

  @Field(of => String)
    createdAt: string
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
    first: number | null

  @Field(of => String, { description: '向前分页游标', nullable: true })
    after: string | null

  @Field(of => Int, { description: '最早的n个对象', nullable: true })
    last: number | null

  @Field(of => String, { description: '向后分页游标', nullable: true })
    before: string | null

  @Field(of => ORDER_BY, { description: '排序方式', nullable: true, defaultValue: ORDER_BY.CREATED_AT_DESC })
    orderBy: ORDER_BY | null
}

@ArgsType()
export class QueryPostsFilter {
  @Field(of => String, { nullable: true, description: '指定 University 下的 Post' })
    universityId: string | null

  @Field(of => String, { nullable: true, description: '指定 Subject 下的 Post' })
    subjectId: string | null
}

@ObjectType()
export class PostsConnectionWithRelay extends Connection<Post>(Post) {}
