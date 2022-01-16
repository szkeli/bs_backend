import { Injectable } from '@nestjs/common'
import {
  DgraphClient,
  DgraphClientStub,
  Operation
} from 'dgraph-js'

@Injectable()
export class DbService {
  private readonly dgraphStub: DgraphClientStub
  private readonly dgraph: DgraphClient
  constructor () {
    this.dgraphStub = new DgraphClientStub('api.szlikeyou.com:9080')
    this.dgraph = new DgraphClient(this.dgraphStub)
  }

  getDgraphIns () {
    return this.dgraph
  }

  async init () {}

  // testetstssssssssssssssssssssssssssssssssssss
  async dropAll (q: DgraphClient) {
    const op = new Operation()
    op.setDropAll(true)
    await q.alter(op)
  }

  async dropData (q: DgraphClient) {
    const op = new Operation()
    op.setDropOp(Operation.DropOp.DATA)
    await q.alter(op)
  }

  async setSchema () {
    const schema = `
      
      posts: [uid] @count @reverse . 
      comments: [uid] @count @reverse .
      reports: [uid] @reverse .
      subjects: [uid] @reverse .
      votes: [uid] @reverse .
      subject: uid @reverse .
      comment: uid @reverse .
      post: uid @reverse .
      handler: uid @reverse .
      to: uid @reverse .
      blocker: uid @reverse .
      creator: uid @reverse .
      folder: uid @reverse .
      userId: string @index(exact, hash, fulltext) .
      sign: password .
      name: string @index(exact, fulltext) .
      avatarImageUrl: string @index(exact) .
      backgroundImageUrl: string @index(exact) .
      images: [string] .
      location: geo .
      title: string @index(fulltext) .
      content: string @index(fulltext) .
      description: string @index(fulltext) .
      type: string @index(term) .
      createdAt: dateTime @index(hour) .
      updatedAt: dateTime @index(hour) .
      lastLoginedAt: dateTime @index(hour) .
      gender: string @index(term) .
      school: string @index(term) .
      grade: string @index(term) .
      openId: string @index(hash) .
      unionId: string @index(hash) .
      

      # 管理员
      type Admin {
        # 唯一用户 id
        userId
        # 密码
        sign
        # 名字
        name
        # 头像链接
        avatarImageUrl
        # 注册时间
        createdAt
        # 用户信息更新时间
        updatedAt
        # 上一次登录时间
        lastLoginedAt
        # 当前管理员的创建者
        creator
      }

      # 用户
      type User {
        # 唯一用户 id
        userId
        # 用户的密码
        sign
        # 用户的名字
        name
        # 用户的头像链接
        avatarImageUrl
        # 用户性别
        gender
        # 用户的学校
        school
        # 用户的年级
        grade
        # 用户的openId
        openId
        # 用户的unionId
        unionId
        # 用户注册时间
        createdAt
        # 用户上一次更新信息时间
        updatedAt
        # 用户上一次登录时间
        lastLoginedAt
        # 用户发布的帖子
        posts
        # 用户创建的主题 用于存放帖子
        subjects
        # 用户的点赞
        votes
      }

      # 帖子
      type Post {
        # 帖子的名字
        title
        # 帖子的内容
        content
        # 帖子的图片
        images
        # 帖子的创建者
        creator
        # 帖子的创建时间
        createdAt
        # 帖子的封禁者
        blocker
        # 帖子的点赞
        votes
        # 帖子的举报
        reports
        # 帖子的位置
        location
        # 帖子的评论
        comments
        # 所属主题
        subject
      }


      # 点赞
      type Vote {
        createdAt
        creator
        to
        type
      }

      # 帖子和评论的评论
      type Comment {
        # 评论的创建时间
        createdAt
        # 评论的内容
        content
        # 评论的创建者
        creator
        # 评论的点赞
        votes
        # 评论的折叠者
        folder
        # 评论的举报
        reports
        # 评论的评论
        comments
        # 评论所属的帖子
        post
        # 评论所属的评论
        comment
      }

      # 帖子的主题
      type Subject {
        # 创建时间
        createdAt
        # 标题
        title
        # 主题描述
        description
        # 头像
        avatarImageUrl
        # 背景
        backgroundImageUrl
        # 创建者
        creator
        # 包含的帖子
        posts
      }

      # 帖子的举报
      type Report {
        # 举报者
        creator
        # 举报类型
        type
        # 举报的具体描述
        description
        # 举报的创建时间
        createdAt
        # 举报的处理者
        handler
      }
    `
    const op = new Operation()
    op.setSchema(schema)
    await this.dgraph.alter(op)
  }

  async test () {
    await this.setSchema()
  }

  // teststsssssssssssssssssssssssssssssssssssssssssssssssssss
}
