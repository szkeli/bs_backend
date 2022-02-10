import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient, Mutation, Request } from 'dgraph-js'

import { DbService } from 'src/db/db.service'

import { PostsConnection } from '../posts/models/post.model'
import { now } from '../tool'
import { User } from '../user/models/user.model'
import {
  CreateSubjectArgs,
  Subject,
  SubjectId,
  SubjectsConnection,
  UpdateSubjectArgs
} from './model/subject.model'

@Injectable()
export class SubjectService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async deleteSubject (actorId: string, subjectId: string) {
    const _now = now()
    const query = `
      query v($actorId: string, $subjectId: string) {
        v(func: uid($actorId)) { v as uid }
        u(func: uid($subjectId)) @filter(type(Subject)) { u as uid }
        # actor 是管理员
        x(func: uid($actorId)) @filter(type(Admin)) { x as uid }
        # actor 是subject的创建者
        y(func: uid($subjectId)) @filter(uid_in(creator, $actorId)) { y as uid }
        # subject 未被删除
        d(func: uid($subjectId)) @filter(not has(delete)) { d as uid }
      }
     `
    // actor是管理员
    const conditions1 = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 1) and eq(len(y), 0) and eq(len(d), 1) )'
    // actor是subject的创建者
    const conditions2 = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 0) and eq(len(y), 1) and eq(len(d), 1) )'
    const mutation = {
      uid: '_:delete',
      'dgraph.type': 'Delete',
      createdAt: _now,
      to: {
        uid: subjectId,
        delete: {
          uid: '_:delete'
        }
      },
      creator: {
        uid: actorId,
        deletes: {
          uid: '_:delete'
        }
      }
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{uid: string}>
      y: Array<{uid: string}>
      d: Array<{uid: string}>
    }>({
      mutations: [
        { mutation, condition: conditions1 },
        { mutation, condition: conditions2 }
      ],
      query,
      vars: {
        $actorId: actorId,
        $subjectId: subjectId
      }
    })

    if (res.json.x.length !== 1 && res.json.y.length !== 1) {
      throw new ForbiddenException(`${actorId} 既不是 ${subjectId} 的创建者也不是管理员`)
    }

    if (res.json.d.length !== 1) {
      throw new ForbiddenException(`主题 ${subjectId} 已被删除`)
    }

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`操作者 ${actorId} 不存在`)
    }

    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`主题 ${subjectId} 不存在`)
    }

    return {
      id: res.uids.get('delete'),
      createdAt: _now
    }
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

  async subjects (first: number, offset: number): Promise<SubjectsConnection> {
    const query = `
        query {
          var(func: type(Subject)) @filter(not has(delete)) {
            subjects as uid
          }
          totalCount(func: uid(subjects)) {
            count(uid)
          }
          subjects(func: uid(subjects), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
            id: uid
            expand(_all_)
          }
        }
      `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      subjects: Subject[]
    }>({ query })

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.subjects ?? []
    }
  }

  async updateSubject (actorId: string, subjectId: string, args: UpdateSubjectArgs) {
    const query = `
      query v($actorId: string, $subjectId: string) {
        v(func: uid($actorId)) @filter(type(Admin) or type(User)) { v as uid }
        u(func: uid($subjectId)) @filter(type(Subject)) { u as uid }
        x(func: uid($actorId)) @filter(type(Admin)) { x as uid }
        y(func: uid($subjectId)) @filter(uid_in(creator, $actorId)) { y as uid }
        subject(func: uid($subjectId)) @filter(type(Subject)) {
          id: uid
          expand(_all_)
        }
      }
    `
    // 操作者是管理员
    const condition1 = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 1) and eq(len(y), 0) )'
    // 操作者是 subject 创建者
    const condition2 = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 0) and eq(len(y), 1) )'

    const mutation = {
      uid: subjectId,
      'dgraph.type': 'Subject'
    }

    Object.assign(mutation, args)

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{uid: string}>
      y: Array<{uid: string}>
      subject: Subject[]
    }>({
      mutations: [
        { mutation, condition: condition1 },
        { mutation, condition: condition2 }
      ],
      query,
      vars: {
        $actorId: actorId,
        $subjectId: subjectId
      }
    })

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`操作者 ${actorId} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`主题 ${subjectId} 不存在`)
    }
    if (res.json.x.length !== 1 && res.json.y.length !== 1) {
      throw new ForbiddenException(`操作者 ${actorId} 既不是 ${subjectId} 的创建者也不是管理员`)
    }

    Object.assign(res.json.subject[0], args)

    return res.json.subject[0]
  }

  async createASubject (creator: string, input: CreateSubjectArgs) {
    const txn = this.dgraph.newTxn()
    try {
      const conditions = '@if( eq(len(v), 1) )'
      const query = `
      query {
        q(func: uid(${creator})) @filter(type(User)) { v as uid }
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
        throw new ForbiddenException(`用户 ${creator} 不存在`)
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
          subject(func: uid($uid)) @filter(type(Subject)) {
            creator @filter(type(User)) {
              id: uid
              expand(_all_)
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

      return user
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
            subject @filter(type(Subject)) {
              id: uid
              expand(_all_)
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
