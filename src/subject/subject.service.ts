import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient, Mutation, Request } from 'dgraph-js'

import { DbService } from 'src/db/db.service'

import { PostsConnection } from '../posts/models/post.model'
import { User } from '../user/models/user.model'
import {
  CreateSubjectInput,
  Subject,
  SubjectId,
  SubjectsConnection,
  UpdateSubjectInput
} from './model/subject.model'

@Injectable()
export class SubjectService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async subject (id: SubjectId) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
      query v($uid: string) {
        subject(func: uid($uid)) {
          id: uid
          createdAt
          title
          description
          avatarImageUrl
          backgroundIMageUrl
        }
      }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .queryWithVars(query, { $uid: id })
      return res.getJson().subject[0] as unknown as Subject
    } finally {
      await txn.discard()
    }
  }

  async subjects (first: number, offset: number) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query {
          totalCount(func: type(Subject)) {
            count(uid)
          }
          v(func: type(Subject), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
            id: uid
            createdAt
            title
            description
            avatarImageUrl
            backgroundImageUrl
          }
        }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .query(query)
      const u: SubjectsConnection = {
        nodes: res.getJson().v || [],
        totalCount: res.getJson().totalCount[0].count
      }
      return u
    } finally {
      await txn.discard()
    }
  }

  async updateSubject (input: UpdateSubjectInput) {
    return await this.dbService.updateSubject(input)
  }

  async createASubject (creator: string, input: CreateSubjectInput) {
    const txn = this.dgraph.newTxn()
    try {
      const conditions = '@if( eq(len(v), 1) )'
      const query = `
      query {
        q(func: uid(${creator})) { v as uid }
      }
    `
      const now = new Date().toISOString()

      const mutation = {
        uid: creator,
        subjects: {
          uid: '_:subject',
          'dgraph.type': 'Subject',
          title: input.title,
          description: input.description,
          avatarImageUrl: input.avatarImageUrl,
          backgroundImageUrl: input.backgroundImageUrl,
          createdAt: now,
          creator: {
            uid: creator,
            subjects: {
              uid: '_:subject'
            }
          }
        }
      }

      const mu = new Mutation()
      mu.setSetJson(mutation)
      mu.setCond(conditions)

      const req = new Request()
      req.setQuery(query)
      req.addMutations(mu)
      req.setCommitNow(true)
      const res = await txn.doRequest(req)
      const v = res.getJson().q[0]
      if (!v || !v.uid) {
        throw new ForbiddenException(`${creator} 用户不存在`)
      }
      const u: Subject = {
        id: res.getUidsMap().get('subject'),
        createdAt: now,
        title: input.title,
        description: input.description,
        avatarImageUrl: input.avatarImageUrl,
        backgroundImageUrl: input.backgroundImageUrl
      }
      return u
    } finally {
      await txn.discard()
    }
  }

  async getCreatorOfSubject (id: SubjectId) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query v($uid: string) {
          subject(func: uid($uid)) {
            creator {
              id: uid
              name
              userId
              avatarImageUrl
              gender
              school
              grade
              openId
              unionId
              createdAt
              updatedAt
              lastLoginedAt
            }
          }
        }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .queryWithVars(query, { $uid: id })
      const user = res.getJson().subject[0].creator as unknown as User
      if (!user) {
        throw new ForbiddenException('user不存在')
      }

      const u: User = {
        id: user.id,
        userId: user.userId,
        name: user.name,
        avatarImageUrl: user.avatarImageUrl,
        gender: user.gender,
        school: user.school,
        grade: user.grade,
        openId: user.openId,
        unionId: user.unionId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginedAt: user.lastLoginedAt
      }
      return u
    } finally {
      await txn.discard()
    }
  }

  async findASubjectByPostId (id: SubjectId) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query v($uid: string) {
          post(func: uid($uid)) @filter(has(subject)) {
            uid
            title
            subject {
              id: uid
              createdAt
              title
              description
              avatarImageUrl
              backgorundImageeUrl
            }
          }
        }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .queryWithVars(query, { $uid: id })
      return res.getJson().post[0]?.subject as unknown as Subject
    } finally {
      await txn.discard()
    }
  }

  async findPostsBySubjectId (id: string, first: number, offset: number) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query v($uid: string) {
          subject(func: uid($uid)) {
            postsCount: count(posts)
            posts (orderdesc: createdAt, first: ${first}, offset: ${offset}) {
              id: uid
              title
              content
              createdAt
            }
          }
        }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .queryWithVars(query, { $uid: id })
      const v = res.getJson().subject[0]
      const u: PostsConnection = {
        nodes: v.posts ? v.posts : [],
        totalCount: v.postsCount
      }
      return u
    } finally {
      await txn.discard()
    }
  }
}
