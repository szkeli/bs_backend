import { createUnionType, Field, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

import { Time } from 'src/db/model/db.model'

import { Comment } from '../../comment/models/comment.model'
import { Post } from '../../posts/models/post.model'
import { User } from '../../user/models/user.model'

export enum SEARCHTYPE {
  USER = 'USER',
  COMMENT = 'COMMENT',
  POST = 'POST',
}

registerEnumType(SEARCHTYPE, {
  name: 'SEARCHTYPE'
})

@InputType()
export class SearchInput {
  @Field(type => Int)
    startTime: Time

  @Field(type => Int)
    endTime: Time

  @Field()
    keys: string
}

@ObjectType()
export class SearchResult {
  @Field(type => Int)
    startTime: Time

  @Field(type => Int)
    endTime: Time

  @Field()
    keys: string
}

@ObjectType()
export class SearchResultItemEdge {
  @Field(type => String)
    cursor: string

  @Field(type => SearchResultItem)
    node: typeof SearchResultItem
}

@ObjectType()
export class Search {
  @Field(type => Int)
    startTime: Time

  @Field(type => Int)
    endTime: Time

  @Field()
    keys: string
}

@ObjectType()
export class SearchResultItemConnection {
  @Field(type => Int, { nullable: true, description: '搜索用户时，返回的结果中的用户总数' })
    userCount?: number

  @Field(type => Int, { nullable: true, description: '搜索帖子时，返回的结果中帖子的总数' })
    postCount?: number

  @Field(type => Int, { nullable: true, description: '搜索评论时，返回的结果中评论的总数' })
    commentCount?: number

  @Field(type => [SearchResultItem])
    nodes: Array<typeof SearchResultItem>

  // @Field(type => PageInfo)
  //   pageInfo: PageInfo

  // @Field(type => SearchResultItemEdge)
  // edges: SearchResultItemEdge
}
export const SearchResultItem = createUnionType({
  name: 'SearchResultItem',
  types: () => [Post, User, Comment]
})
