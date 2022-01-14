import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient, Mutation, Request } from 'dgraph-js'

import { DbService } from 'src/db/db.service'
import { UserId } from 'src/db/model/db.model'

import { PostsConnection } from '../posts/models/post.model'
import {
  CreateFollowRelationInput,
  DeleteFollowRelationInput,
  User,
  UserDataBaseType,
  UserFollowASubjectInput,
  UserRegisterInput,
  UserUpdateProfileInput
} from './models/user.model'

@Injectable()
export class UserService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
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
            }
          }
        }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .queryWithVars(query, { $uid: id })
      const v = res.getJson().me[0]
      const u: PostsConnection = {
        nodes: v.posts,
        totalCount: v.postsCount
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
      const user = res.getJson().user[0]
      if (!user) {
        throw new Error('Can not find the user')
      }
      return user
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
