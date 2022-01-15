import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient, Mutation, Request } from 'dgraph-js'

import { DbService } from 'src/db/db.service'
import { UserId } from 'src/db/model/db.model'

import { Post, PostsConnection } from '../posts/models/post.model'
import { Subject, SubjectsConnection } from '../subject/model/subject.model'
import {
  CreateFollowRelationInput,
  DeleteFollowRelationInput,
  User,
  UserDataBaseType,
  UserFollowASubjectInput,
  UserRegisterInput,
  UsersConnection,
  UserUpdateProfileInput
} from './models/user.model'

@Injectable()
export class UserService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async findSubjectsByUid (id: string, first: number, offset: number) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query v($uid: string) {
          totalCount(func: uid($uid)) {
            subjects {
              count(uid)
            }
          }
          subjects(func: uid($uid)) {
            subjects (orderdesc: createdAt, first: ${first}, offset: ${offset}){
              id: uid
              createdAt
              title
              description
              avatarImageUrl
              backgroundImageUrl
            }
          }
        }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .queryWithVars(query, { $uid: id })

      const v = res.getJson() as unknown as { subjects?: Array<{subjects: [Subject]}>, totalCount?: Array<{subjects: Array<{count: number}>}>}

      const u: SubjectsConnection = {
        totalCount: v.totalCount[0]?.subjects[0]?.count || 0,
        nodes: v?.subjects[0]?.subjects || []
      }
      return u
    } finally {
      await txn.discard()
    }
  }

  async users (first: number, offset: number) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query {
          totalCount(func: type(User)) {
            count(uid)
          }
          users(func: type(User), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
            id: uid
            userId
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
          }
        }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .query(query)
      const v = res.getJson() as unknown as { users?: [User], totalCount?: Array<{count: number}>}
      const u: UsersConnection = {
        nodes: v.users || [],
        totalCount: v.totalCount[0].count || 0
      }
      return u
    } finally {
      await txn.discard()
    }
  }

  async findPostsByUid (id: string, first: number, offset: number) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query v($uid: string) {
          me(func: uid($uid)) {
            postsCount: count(posts)
            posts (orderdesc: createdAt, first: ${first}, offset: ${offset}) {
              id: uid
              title
              content
              createdAt
              votes @filter(uid_in(creator, $uid)) {
                count(uid)
              }
            }
          }
        }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .queryWithVars(query, { $uid: id })
      const v = res.getJson() as unknown as { me?: Array<{postsCount: number, posts?: Array<(Post & { votes: Array<{ count: number}>})>}>}
      v.me[0].posts.forEach(p => {
        p.viewerCanUpvote = (p?.votes?.length ?? 0) === 0
      })
      const u: PostsConnection = {
        nodes: v.me[0].posts as unknown as [Post] || [],
        totalCount: v.me[0].postsCount || 0
      }
      return u
    } finally {
      await txn.discard()
    }
  }

  async followOne (input: CreateFollowRelationInput) {
    if (input.from === input.to) {
      throw new ForbiddenException('禁止关注自己')
    }
    return await this.dbService.followAPerson(input)
  }

  async unfollowOne (input: DeleteFollowRelationInput) {
    if (input.from === input.to) {
      throw new ForbiddenException('禁止取消关注自己')
    }
    return await this.dbService.unfollowAPerson(input)
  }

  async getUserByUid (id: string) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query v($uid: string) {
          user(func: uid($uid)) {
            id: uid
            userId
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
          }
        }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .queryWithVars(query, { $uid: id })
      const { user } = res.getJson() as unknown as { user: [User]}
      if (!user[0]) {
        throw new ForbiddenException(`用户 ${id} 不存在`)
      }
      return user[0]
    } finally {
      await txn.discard()
    }
  }

  async registerAUser (input: UserRegisterInput) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query {
          q(func: eq(userId, "${input.userId}")) { v as uid }
        }
      `
      const now = new Date().toISOString()
      const user: UserDataBaseType = {
        uid: '_:user',
        'dgraph.type': 'User',
        userId: input.userId,
        sign: input.sign,
        name: input.name,
        avatarImageUrl: input.avatarImageUrl,
        gender: input.gender,
        school: input.school,
        grade: input.grade,
        openId: input.openId,
        unionId: input.unionId,
        createdAt: now,
        updatedAt: now,
        lastLoginedAt: now
      }
      const conditions = '@if( eq(len(v), 0) )'
      const mu = new Mutation()
      mu.setSetJson(user)
      mu.setCond(conditions)

      const req = new Request()
      req.setQuery(query)
      req.addMutations(mu)
      req.setCommitNow(true)
      const res = await txn.doRequest(req)
      const success = res.getUidsMap().get('user')
      if (!success) {
        throw new ForbiddenException('该userId已被使用')
      }
      const v: User = {
        id: success,
        name: input.name,
        userId: input.userId,
        openId: input.openId,
        unionId: input.unionId,
        gender: input.gender,
        createdAt: now,
        updatedAt: now,
        lastLoginedAt: now,
        avatarImageUrl: input.avatarImageUrl,
        school: input.school,
        grade: input.grade
      }
      return v
    } finally {
      await txn.discard()
    }
  }

  async updateUser (userId: UserId, input: UserUpdateProfileInput) {
    return await this.dbService.updateAUser(userId, input)
  }

  async followASubject (l: UserFollowASubjectInput) {
    return await this.dbService.userFollowASubject(l)
  }
}
