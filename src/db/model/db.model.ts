import { ORDERBY } from 'src/user/models/user.model'

export type UserId = string
export type PostId = string
export type CommentId = string
export type SysId = string
export type Time = number

export class GetAUserAllPostDto {
  userId: UserId
  skip: number
  limit: number
  orderBy: ORDERBY
}
export enum RANGE {
  INCR = 'incr',
  DECR = 'decr',
  // 随机排序
  SHUFFLE = 'shuffle',
}
export class CreateUserDto {
  nickName: string
  createAt: Time
  lastLoginAt: Time
  avatarUrl: string
  unionId: string
  openId: string
  school: string
  grade: string
  gender: string
}
export class CreateAAdminerDto {
  action: string[]
  createAt: Time
  lastLoginAt: Time
  createBy: UserId
  privilege: PRIVILEGE
  nickName: string
}

export enum PRIVILEGE {
  NORMAL = 'ADMIN',
}
export class UnFollowAPersonDto {
  from: UserId
  to: UserId
}
export class FollowAPersonDto {
  /**
   * 关注者
   */
  from: UserId
  /**
   * 被关注者
   */
  to: UserId
}
export interface CreateACommentAtCommentDto {
  creator: UserId
  commentId: CommentId
  content: string
  createAt: Time
}
export class CreateAPostDto {
  userId: UserId
  content: string
  title: string
  createAt: Time
}
export class CreateACommentDto {
  userId: UserId
  postId: PostId
  content: string
  createAt: Time
}

export interface MyData {
  [index: string]: string
}

export class CreateVertexLabelDto {
  name: string
  id_strategy: ID_STRATEGY
  properties?: string[]
  primary_keys?: string[]
  nullable_keys?: string[]
  enable_label_index?: boolean
  // only hugegraph version >= v0.11.2
  ttl?: number
  // only hugegraph version >= v0.11.2
  ttl_start_time?: string
  user_data?: MyData
}

export class CreateVertexLabelResponseDto {
  id: number | string
  primary_keys: [string]
  id_strategy: ID_STRATEGY
  name: string
  index_names: [string]
  properties: [string]
  nullable_keys: [string]
  enable_label_index: boolean
  user_data: MyData
}

export class GetAllVertexLabel {
  vertexlabels: [VertexLabel]
}

export class VertexLabel {
  id: number
  primary_keys: [string]
  id_strategy: ID_STRATEGY
  name: string
  index_names: [string]
  properties: [string]
  nullable_keys: [string]
  // 类型索引 开启会影响性能
  enable_label_index: boolean
  user_data: MyData
}

export enum ICON_SIZE {
  NORMAL = 'NORMAL',
  HUGE = 'HUGE',
  BIG = 'BIG',
  SMALL = 'SMALL',
  TINY = 'TINY',
}

export enum ID_STRATEGY {
  DEFAULT = 'AUTOMATIC',
  AUTOMATIC = 'AUTOMATIC',
  CUSTOMIZE_STRING = 'CUSTOMIZE_STRING',
  CUSTOMIZE_NUMBER = 'CUSTOMIZE_NUMBER',
  CUSTOMIZE_UUID = 'CUSTOMIZE_UUID'
}

export class DeleteVertexLabelByNameDto {
  task_id: number
}

export class GetAllPropertyKeyDto {
  propertykeys: [PropertyKey]
}

export class PropertyKey {
  id: number
  name: string
  data_type: DATA_TYPE
  cardinality: CARDINALITY
  properties: [any]
  user_data: MyData
}

export class CreateAPropertyKeyDTO {
  name: string
  data_type: DATA_TYPE
  cardinality: CARDINALITY
}

export enum DATA_TYPE {
  TEXT = 'TEXT',
  INT = 'INT',
  DOUBLE = 'DOUBLE',
  BOOLEAN = 'BOOLEAN',
  BYTE = 'BYTE',
  LONG = 'LONG',
  FLOAT = 'FLOAT',
  DATE = 'DATE',
  UUID = 'UUID',
  BLOB = 'BLOB',
}

export enum CARDINALITY {
  SINGLE = 'SINGLE',
  LIST = 'LIST',
  SET = 'SET',
}
