import { ForbiddenException, Injectable } from '@nestjs/common'
import {
  DgraphClient,
  DgraphClientStub,
  Mutation,
  Operation
} from 'dgraph-js'
import * as gremlin from 'gremlin'

import {
  Comment,
  PagingConfigInput
} from 'src/comment/models/comment.model'
import {
  Post
} from 'src/posts/models/post.model'
import {
  Subject,
  SubjectId,
  UpdateSubjectInput
} from 'src/subject/model/subject.model'
import {
  DeleteFollowRelationInput,
  User,
  UserFollowASubjectInput,
  UserUpdateProfileInput
} from 'src/user/models/user.model'
import {
  UnvoteACommentInput,
  UnvoteAPostInput,
  VoteACommentInput
} from 'src/votes/model/votes.model'

import {
  objectify,
  SocialTraversalSource
} from './dsl'
import {
  FollowAPersonDto,
  PostId,
  UserId
} from './model/db.model'

const __ = gremlin.process.statics

@Injectable()
export class DbService {
  private readonly g: SocialTraversalSource
  private readonly dgraphStub: DgraphClientStub
  private readonly dgraph: DgraphClient
  constructor () {
    const traversal = gremlin.process.AnonymousTraversalSource.traversal
    this.g = traversal(SocialTraversalSource).withRemote(
      null
    )
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

  async addData () {
    const txn = this.dgraph.newTxn()
    try {
      const createAPost = {
        uid: '0xeb67',
        posts: [{
          uid: '_:post',
          'dgraph.type': 'Post',
          title: '测试帖子',
          content: '测试帖子',
          creator: {
            uid: '0xeb67'
          }
        }]
      }
      const _createAPost = {
        uid: '_:post',
        'dgraph.type': 'Post',
        title: '哈哈哈',
        content: '测试内容',
        images: ['dsioajdsa', 'dsaiojdsai', 'dsaokdsa'],
        creator: {
          uid: '0xeb67'
        },
        comments: [{
          uid: '_:comment',
          'dgraph.type': 'Comment',
          content: 'hahhaha',
          creator: {
            uid: '0xeb67'
          }
        }]
      }
      const p = {
        uid: '_:alice',
        'dgraph.type': 'User',
        name: 'Aliceuid(d)',
        passworld: 'dsadsa',
        avatarImageUrl: 'dsadsa'
      }

      const mu = new Mutation()
      mu.setSetJson(createAPost)
      const response = await txn.mutate(mu)
      // const response = await txn.doRequest(req)
      await txn.commit()

      console.error(`
        Created person named "Alice" with uid = ${response.getUidsMap().get('alice')}
      `)

      console.error('All created nodes (map from blank node names to uids):')
      response.getUidsMap().forEach((uid, key) => console.error(`${key} => ${uid}`))
      console.error()
    } finally {
      await txn.discard()
    }
  }

  async queryData () {
    const query = `
      query all($a: string) {
        all(func: eq(name, $a)) {
          uid
          name
          age
          married
          loc
          dob
          friend {
            uid
            name
            age
          } 
          school {
            uid
            name
          }
        }
      }
    `
    const vars = { $a: 'Alice' }
    const res = await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, vars)
    const ppl = res.getJson() as unknown as any

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.error(`Number of people named Alice: ${ppl.all.length}`)
    ppl.all.forEach(p => console.error(p))
  }

  async test () {
    // const a = await this.dropAll(this.dgraph)
    // const b = await this.setSchema(this.dgraph)
    // console.error({ a, b })
    // await this.addData()
    // await this.queryData()
    // await this.dropAll(this.dgraph)
    await this.setSchema()
    // await this.addData()
    // await this.queryData()
  }

  // teststsssssssssssssssssssssssssssssssssssssssssssssssssss

  async checkUserPasswordAndGetUser (userId: string, sign: string) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
      query v($sign: string, $userId: string){
        check(func: eq(userId, $userId)) {
          uid
          name
          avatarImageUrl
          gender
          school
          grade
          openId
          unionId
          createdAt
          updatedAt
          lastLoginedAt
          success: checkpwd(sign, $sign)
        }
      }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .queryWithVars(query, {
          $userId: userId,
          $sign: sign
        })

      const v = res.getJson() as unknown as any
      const u = v.check[0]
      if (!u || !u.success) {
        throw new ForbiddenException('用户名或密码错误')
      }
      const user: User = {
        id: u.uid,
        userId: u.userId,
        name: u.name,
        avatarImageUrl: u.avatarImageUrl,
        gender: u.gender,
        school: u.school,
        grade: u.grade,
        openId: u.openId,
        unionId: u.unionId,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastLoginedAt: u.lastLoginedAt
      }
      return user
    } finally {
      await txn.discard()
    }
  }

  async updateAUser (userId: UserId, input: UserUpdateProfileInput) {
    let u = this.g.user(userId)
    for (const props of Object.entries(input)) {
      if (props[0] === 'id' || props[0] === 'userId') continue
      u = u.property(props[0], props[1])
    }
    return await u
      .filterAllUserProps()
      .toList()
      .then(r => objectify<User>(r[0]))
  }

  async deleteAPost (creator: UserId, id: PostId) {
    // tips: 即使帖子不存在也返回删除成功
    return await this.g
      .user(creator)
      .out('created_post')
      .post(id)
      .hasLabel('post')
      .drop()
      .next()
      .then(r => r.done)
  }

  async voteAPost (voter: UserId, to: string) {
    return await this.g
      .user(voter)
      .addE('voted_post')
      .property('createAt', Date.now())
      .to(__.V(to))
      .V(to)
      .hasLabel('post')
      .filterAllPostProps()
      .toList()
      .then(r => objectify<Post>(r[0]))
  }

  async voteAComment (voter: UserId, input: VoteACommentInput) {
    return await this.g
      .user(voter)
      .addE('voted_comment')
      .property('createAt', Date.now())
      .to(__.V(input.to)
        .hasLabel('comment'))
      .V(input.to)
      .hasLabel('comment')
      .filterAllCommentProps()
      .toList()
      .then(r => objectify<Comment>(r[0]))
  }

  async unvoteAPost (voter: UserId, input: UnvoteAPostInput) {
    return await this.g
      .user(voter)
      .outE('voted_post')
      .as('e')
      .inV()
      .hasId(input.to)
      .hasLabel('post')
      .select('e')
      .drop()
      .next()
      .then(r => r.done)
  }

  async unvoteAComment (voter: UserId, input: UnvoteACommentInput) {
    return await this.g
      .user(voter)
      .outE('voted_comment')
      .as('e')
      .inV()
      .hasId(input.to)
      .hasLabel('comment')
      .select('e')
      .drop()
      .next()
      .then(r => r.done)
  }

  private async isUserExsit (userId: UserId) {
    return await this.g
      .user(userId)
      .count()
      .toList()
      .then(r => r[0] === 1)
  }

  async followAPerson (input: FollowAPersonDto) {
    if (!await this.isUserExsit(input.to)) {
      throw new ForbiddenException('被关注用户不存在')
    }
    return await this.g
      .user(input.to)
      .as('to')
      .user(input.from)
      .addE('followed')
      .property('createAt', Date.now())
      .to('to')
      .toList()
      .then(r => r.length !== 0)
  }

  async unfollowAPerson (input: DeleteFollowRelationInput) {
    if (!await this.isUserExsit(input.to)) {
      throw new ForbiddenException('被取消关注的用户不存在')
    }
    return await this.g
      .user(input.to)
      .inE('followed')
      .as('e')
      .outV()
      .user(input.from)
      .select('e')
      .drop()
      .next()
      .then(r => r.done)
  }

  async updateSubject (input: UpdateSubjectInput) {
    let u = this.g.subject(input.id)
    for (const props of Object.entries(input)) {
      if (props[0] === 'id') continue
      u = u.property(props[0], props[1])
    }
    return await u
      .filterAllSubjectProps()
      .toList()
      .then(r => objectify<Subject>(r[0]))
  }

  async getUsersBySubjectId (id: SubjectId, input: PagingConfigInput) {
    return await this.g
      .subject(id)
      .in_('followed_subject')
      .hasLabel('user')
      .order()
      .by('createAt', this.g.orderBy(input.orderBy))
      .range(input.skip, input.skip + input.limit)
      .filterAllUserProps()
      .toList()
      .then(r => r.map(v => objectify<User>(v)))
  }

  async userFollowASubject (l: UserFollowASubjectInput) {
    // TODO 判断主题是否存在
    return await this.g
      .subject(l.to)
      .as('s')
      .user(l.from)
      .addE('followed_subject')
      .property('createAt', Date.now())
      .to('s')
      .select('s')
      .filterAllSubjectProps()
      .toList()
      .then(r => objectify<Subject>(r[0]))
  }

  async search () {
    return await this.g
      .v()
      // .V()
      .hasLabel('user')
      .has('nickName', gremlin.process.TextP.containing('测 试'))
      .filterAllUserProps()
      .toList()
      .then(r => {
        return r
      })
  }
}
