import { Field, Float, Int, ObjectType } from '@nestjs/graphql'
import { Mutation } from 'dgraph-js'

export type UserId = string
export type PostId = string
export type Time = number

@ObjectType()
export class SetDbSchema {
  @Field(type => Int)
    arrayIndexOffset: number

  @Field(type => [String])
    array: string[]

  @Field(type => Float)
    pivot_: number

  @Field({ nullable: true })
    wrappers_?: string

  @Field({ nullable: true })
    messageId_?: string

  @Field()
    convertedPrimitiveFields_: string
}

export interface CommitConditionalUpertsProps {
  mutations: MutationsWithCondition[]
  query: string
  vars: Vars
}

export interface CommitMutationProps {
  mutations: CommitMutationsType[]
  query: string
  vars: Vars
}

export interface CommitMutationsType {
  del: object
  set: object
  cond: string | null
}

export interface CommitProps {
  mutations: Mutation[]
  query: string
  vars: Vars
}

export interface Mutations {
  mutation: object
  condition: string
  delete: boolean
}

export interface MutationsWithCondition {
  mutation: object
  condition: string
}

export type MutationObject = object & {
  'dgraph.type': 'User'
  | 'Admin'
  | 'Post'
  | 'Comment'
  | 'Deadline'
  | 'Subject'
  | 'Sentiment'
  | 'Notification'
  | 'Pin'
  | 'Anonymous'
  | 'Credential'
  | 'Role'
  | 'UserAuthenInfo'
  | 'Privilege'
  | 'View'
  | 'Block'
  | 'Fold'
  | 'Delete'
  | 'Vote'
  | 'Report'
  | 'Conversation'
  | 'Message'
  | 'Curriculum'
}

export interface CommitConditionalUpsertWithVarsProps {
  conditions: string
  mutation: object
  query: string
  vars: Vars
}
export interface CommitQueryWithVarsProps {
  query: string
  vars?: Vars
}

export interface Vars {
  [key: string]: string | undefined | null
}
