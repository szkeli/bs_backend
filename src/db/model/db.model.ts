import { Field, Float, Int, ObjectType } from '@nestjs/graphql'

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

export interface MutationsWithCondition {
  mutation: object
  condition: string
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
  [key: string]: string
}
