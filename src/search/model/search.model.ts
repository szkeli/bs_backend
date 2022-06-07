import { ArgsType, createUnionType, Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

import { Time } from 'src/db/model/db.model'

import { Comment } from '../../comment/models/comment.model'
import { Connection, ValueRef } from '../../connections/models/connections.model'
import { Institute } from '../../institutes/models/institutes.model'
import { Post } from '../../posts/models/post.model'
import { SubCampus } from '../../subcampus/models/subcampus.model'
import { Subject } from '../../subject/model/subject.model'
import { University } from '../../universities/models/universities.models'
import { User } from '../../user/models/user.model'

export enum SEARCHTYPE {
  USER = 'USER',
  COMMENT = 'COMMENT',
  POST = 'POST',
  SUBJECT = 'SUBJECT',
  UNIVERSITY = 'UNIVERSITY',
  INSTITUTE = 'INSTITUTE',
  SUBCAMPUS = 'SUBCAMPUS'
}

registerEnumType(SEARCHTYPE, {
  name: 'SEARCHTYPE',
  valuesMap: {
    USER: {
      description: '用户'
    },
    POST: {
      description: '评论'
    },
    SUBJECT: {
      description: '主题'
    },
    UNIVERSITY: {
      description: '大学'
    },
    INSTITUTE: {
      description: '学院'
    },
    SUBCAMPUS: {
      description: '校区'
    }
  }
})

@ObjectType()
export class Search {
  @Field(type => Int)
    startTime: Time

  @Field(type => Int)
    endTime: Time

  @Field()
    keys: string
}

export const SearchResultItem = createUnionType({
  name: 'SearchResultItem',
  types: () => [Post, User, Comment, Subject, University, Institute, SubCampus],
  resolveType (v: {'dgraph.type': Array<string | null> | null}) {
    if (v['dgraph.type']?.includes('Subject')) {
      return Subject
    }
    if (v['dgraph.type']?.includes('Post')) {
      return Post
    }
    if (v['dgraph.type']?.includes('Comment')) {
      return Comment
    }
    if (v['dgraph.type']?.includes('User')) {
      return User
    }
    if (v['dgraph.type']?.includes('University')) {
      return University
    }
    if (v['dgraph.type']?.includes('Institute')) {
      return Institute
    }
    if (v['dgraph.type']?.includes('SubCampus')) {
      return SubCampus
    }
  }
})

@ArgsType()
export class SearchArgs {
  @Field(of => SEARCHTYPE, { nullable: false, description: '检索的类型' })
    type: SEARCHTYPE

  @Field({ nullable: false, description: '待检索的关键字' })
    query: string
}

@ObjectType()
export class SearchResultItemConnection extends Connection(new ValueRef({
  value: SearchResultItem,
  name: 'SearchResultItem'
})) {}
