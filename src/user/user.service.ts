import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient } from 'dgraph-js'

import { DbService } from 'src/db/db.service'

import { UserWithRoles } from '../auth/model/auth.model'
import { Post, PostsConnection } from '../posts/models/post.model'
import { Subject, SubjectsConnection } from '../subject/model/subject.model'
import { code2Session } from '../tool'
import {
  CheckUserResult,
  CreateUserArgs,
  UpdateUserArgs,
  User,
  UserDataBaseType,
  UsersConnection
} from './models/user.model'

@Injectable()
export class UserService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async checkUserPasswordAndGetUser (userId: string, sign: string) {
    const query = `
      query v($sign: string, $userId: string) {
        user(func: eq(userId, $userId)) @filter(type(User) OR type(Admin)) {
          id: t as uid
          expand(_all_)
          success: checkpwd(sign, $sign)
          roles: dgraph.type
        }
      }
      `
    const now = new Date().toISOString()
    const condition = '@if( eq(len(t), 1) )'
    const mutation = {
      uid: 'uid(t)',
      lastLoginedAt: now
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {user: CheckUserResult[]}>({
      query,
      vars: {
        $userId: userId,
        $sign: sign
      },
      mutations: [{ mutation, condition }]
    })
    if (res.json.user.length !== 1 || !res.json.user[0].success) {
      throw new ForbiddenException('用户名或密码错误')
    }
    Object.assign(res.json.user[0], {
      lastLoginedAt: now
    })
    return res.json.user[0]
  }

  async findSubjectsByUid (id: string, first: number, offset: number) {
    const query = `
        query v($uid: string) {
          totalCount(func: uid($uid)) @filter(type(User)){
            subjects @filter(type(Subject)) {
              count(uid)
            }
          }
          subjects(func: uid($uid)) @filter(type(User)) {
            subjects (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Subject)) {
              id: uid
              expand(_all_)
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
  }

  async users (first: number, offset: number) {
    const query = `
        query {
          totalCount(func: type(User)) {
            count(uid)
          }
          users(func: type(User), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
            id: uid
            expand(_all_)
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
  }

  async findPostsByUid (id: string, first: number, offset: number) {
    const query = `
    query v($uid: string) {
      me(func: uid($uid)) {
        postsCount: count(posts)
        posts (orderdesc: createdAt, first: ${first}, offset: ${offset}) {
          id: uid
          expand(_all_)
        }
      }
    }
  `
    const res = await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $uid: id })
    const v = res.getJson() as unknown as { me?: Array<{postsCount: number, posts?: Post[]}>}

    const u: PostsConnection = {
      nodes: v.me[0].posts as unknown as [Post] || [],
      totalCount: v.me[0].postsCount || 0
    }
    return u
  }

  async getUserOrAdminWithRolesByUid (id: string): Promise<UserWithRoles> {
    const query = `
        query v($uid: string) {
          user(func: uid($uid)) @filter(type(User) OR type(Admin)) {
            id: uid
            expand(_all_)
            roles: dgraph.type
          }
        }
      `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $uid: id }))
      .getJson() as unknown as {
      user: UserWithRoles[]
    }
    if (!res || !res.user || res.user.length !== 1) {
      throw new ForbiddenException(`用户或管理员 ${id} 不存在`)
    }
    return res.user[0]
  }

  async registerUser (input: CreateUserArgs): Promise<User> {
    if (input.userId.length <= 2) {
      throw new ForbiddenException('userId 不能少于三个字符')
    }
    let unionId: string = ''
    let openId: string = ''
    if (input.code) {
      const res = await code2Session(input.code)
      unionId = res.unionId
      openId = res.openId
    }

    const query = `
        query v($userId: string) {
          q(func: eq(userId, $userId)) @filter(type(User) OR type(Admin)) { v as uid }
        }
      `
    const now = new Date().toISOString()
    const mutation: UserDataBaseType = {
      uid: '_:user',
      'dgraph.type': 'User',
      userId: input.userId,
      sign: input.sign,
      name: input.name,
      avatarImageUrl: input.avatarImageUrl,
      gender: input.gender,
      school: input.school,
      grade: input.grade,
      openId,
      unionId,
      createdAt: now,
      updatedAt: now,
      lastLoginedAt: now
    }

    const condition = '@if( eq(len(v), 0) )'

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      q: Array<{uid: string}>
    }>({
      mutations: [{ mutation, condition }],
      query,
      vars: {
        $userId: input.userId
      }
    })

    const uid = res.uids.get('user')

    if (!uid || res.json.q.length !== 0) {
      throw new ForbiddenException(`userId ${input.userId} 已被使用`)
    }

    return {
      id: uid,
      name: input.name,
      userId: input.userId,
      openId,
      unionId,
      gender: input.gender,
      createdAt: now,
      updatedAt: now,
      lastLoginedAt: now,
      avatarImageUrl: input.avatarImageUrl,
      school: input.school,
      grade: input.grade
    }
  }

  async updateUser (id: string, args: UpdateUserArgs) {
    if (Object.entries(args).length === 0) {
      throw new ForbiddenException('参数不能为空')
    }
    const now = new Date().toISOString()
    const query = `
      query v($id: string) {
        u(func: uid($id)) @filter(type(User)) { u as uid }
        user(func: uid($id)) @filter(type(User)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const condition = '@if  ( eq(len(u), 1) )'
    const mutation = {
      uid: id,
      updatedAt: now
    }
    Object.assign(mutation, args)
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      u: Array<{uid: string}>
      user: User[]
    }>({
      mutations: [{ mutation, condition }],
      query,
      vars: {
        $id: id
      }
    })
    Object.assign(res.json.user[0], args)
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`用户 ${id} 不存在`)
    }
    return res.json.user[0]
  }
}
