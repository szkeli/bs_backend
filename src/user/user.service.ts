import { ForbiddenException, Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DgraphClient } from 'dgraph-js'

import { DbService } from 'src/db/db.service'

import { SystemAdminNotFoundException, UserIdExistException, UserNotAuthenException, UserNotFoundException } from '../app.exception'
import { UserWithRolesAndPrivilegesAndCredential } from '../auth/model/auth.model'
import { ORDER_BY } from '../connections/models/connections.model'
import { ICredential } from '../credentials/models/credentials.model'
import { Post, PostsConnection, RelayPagingConfigArgs } from '../posts/models/post.model'
import { Privilege, PrivilegesConnection } from '../privileges/models/privileges.model'
import { Role } from '../roles/models/roles.model'
import { Subject, SubjectsConnection } from '../subject/model/subject.model'
import { atob, btoa, code2Session, edgifyByCreatedAt, now, relayfyArrayForward } from '../tool'
import { Vote, VotesConnectionWithRelay } from '../votes/model/votes.model'
import {
  RegisterUserArgs,
  UpdateUserArgs,
  User,
  UsersConnection
} from './models/user.model'

@Injectable()
export class UserService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async votesWithRelay (id: string, { first, after, orderBy }: RelayPagingConfigArgs): Promise<VotesConnectionWithRelay> {
    after = btoa(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.votesWithRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async votesWithRelayForward (id, first: number, after: string): Promise<VotesConnectionWithRelay> {
    const q1 = 'var(func: uid(votes), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(User)) {
          votes as votes (orderdesc: createdAt) @filter(type(Vote))
        }
        ${after ? q1 : ''}
        totalCount(func: uid(votes)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'votes'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(votes), first: -1) {
          createdAt
        }
        endO(func: uid(votes), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startO: Array<{createdAt: string}>
      endO: Array<{createdAt: string}>
      objs: Vote[]
    }>({ query, vars: { $id: id, $after: after } })

    return {
      ...relayfyArrayForward({
        ...res,
        first,
        after
      }),
      viewerCanUpvote: false,
      viewerHasUpvoted: true
    }
  }

  async roles (id: string, { first, after, orderBy }: RelayPagingConfigArgs) {
    after = btoa(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.rolesWithRelayForword(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async rolesWithRelayForword (id: string, first: number, after: string) {
    const q1 = 'var(func: uid(roles), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(User)) {
          roles as roles(orderdesc: createdAt) @filter(type(Role))
        }
        ${after ? q1 : ''}
        totalCount(func: uid(roles)) { count(uid) }
        roles(func: uid(${after ? 'q' : 'roles'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startRole(func: uid(roles), first: -1) {
          createdAt
        }
        # 结束游标
        endRole(func: uid(roles), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      roles: Role[]
      startRole: Array<{createdAt}>
      endRole: Array<{createdAt}>
    }>({ query, vars: { $id: id, $after: after } })

    return relayfyArrayForward({
      totalCount: res.totalCount,
      startO: res.startRole,
      endO: res.endRole,
      objs: res.roles,
      first,
      after
    })
  }

  async credential (id: string) {
    const query = `
      query v($xid: string) {
        var(func: uid($xid)) @filter(type(User)) {
          c as credential @filter(type(Credential))
        }
        credential(func: uid(c)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{credential: ICredential[]}>({ query, vars: { $xid: id } })

    return res.credential[0]
  }

  async privileges (id: string, { first, after, orderBy }: RelayPagingConfigArgs): Promise<PrivilegesConnection> {
    after = btoa(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.privilegesWithRelayForward(id, first, after)
    }

    throw new Error('Method not implemented.')
  }

  async privilegesWithRelayForward (id: string, first: number, after: string): Promise<PrivilegesConnection> {
    const q1 = 'var(func: uid(privileges), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(User)) {
          privileges as privileges @filter(type(Privilege))
        }

        ${after ? q1 : ''}
        totalCount (func: uid(privileges)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'privileges'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(privileges), first: -1) {
          createdAt
        }
        endO(func: uid(privileges), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startO: Array<{createdAt: string}>
      endO: Array<{createdAt: string}>
      objs: Privilege[]
    }>({ query, vars: { $id: id, $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async pureDeleteUser (adminId: string, userId: string) {
    const query = `
      query v($adminId: string, $userId: string) {
        # 管理员
        v(func: uid($adminId)) @filter(type(Admin)) { v as uid }
        u(func: eq(userId, $userId)) @filter(type(User)) {
          # 被删除的用户
          u as uid
          # 非基本数据
          votesCount: votes as votes
          subjectsCount: subjects as subjects
          conversationsCount: conversations as conversations
          reportsCount: reports as reports
        }
      }
    `
    const condition = '@if( eq(len(u), 1) and eq(len(v), 1) and eq(len(votes), 0) and eq(len(subjects), 0) and eq(len(conversations), 0) and eq(len(reports), 0) )'
    const mutation = {
      uid: 'uid(u)',
      'dgraph.type': 'User'
    }

    const res = await this.dbService.commitConditionalDeletions<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{
        votesCount: number
        subjectsCount: number
        conversationsCount: number
        reportsCount: number
        uid: string
      }>
    }>({
      mutations: [
        { mutation, condition }
      ],
      query,
      vars: {
        $adminId: adminId,
        $userId: userId
      }
    })
    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`管理员 ${adminId} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`用户 ${userId} 不存在`)
    }

    return true
  }

  async registerWithin (startTime: string, endTime: string, first: number, offset: number): Promise<UsersConnection> {
    const query = `
      query v($startTime: string, $endTime: string) {
        var(func: between(createdAt, $startTime, $endTime)) @filter(type(User) and not eq(openId, "") and not eq(unionId, "")) {
          users as uid
        }
        totalCount(func: uid(users)) {
          count(uid)
        }
        users(func: uid(users), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
          id: uid
          expand(_all_)
        }
      }
    `

    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      users: User[]
    }>({ query, vars: { $startTime: startTime, $endTime: endTime } })

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.users ?? []
    }
  }

  async user (viewerId: string, id: string): Promise<User> {
    const query = `
        query v($uid: string) {
          user(func: uid($uid)) @filter(type(User)) {
            id: uid
            expand(_all_)
          }
        }
      `
    const res = await this.dbService.commitQuery<{user: User[]}>({ query, vars: { $uid: id } })
    return res.user[0]
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

  async findPostsByXidWithRelayForward (viewerId: string, xid: string, first: number, after: string | null) {
    const cannotViewDelete = `
      var(func: uid($xid)) @filter(type(User)) {
        p as posts @filter(type(Post) and not has(delete) and not has(anonymous))
      }
    `
    const canViewDelete = `
      var(func: uid($xid)) @filter(type(User)) {
        t as posts @filter(type(Post)) {
          d1 as delete @filter(uid_in(creator, $xid))
        }
      }
      var(func: uid(t)) @filter(not uid_in(delete, uid(d1))) {
        p as uid
      }
    `
    const q1 = 'var(func: uid(posts), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($xid: string, $after: string) {
        ${viewerId === xid ? canViewDelete : cannotViewDelete}
        var(func: uid(p), orderdesc: createdAt) { 
          posts as uid
        }
        ${after ? q1 : ''}
        totalCount(func: uid(posts)) { count(uid) }
        posts(func: uid(${after ? 'q' : 'posts'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startPost(func: uid(posts), first: -1) {
          id: uid
          createdAt
        }
        # 结束游标
        endPost(func: uid(posts), first: 1) {
          id: uid
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      posts: Post[]
      startPost: Array<{id: string, createdAt: string}>
      endPost: Array<{id: string, createdAt: string}>
    }>({ query, vars: { $after: after, $xid: xid } })

    const totalCount = res.totalCount[0]?.count ?? 0
    const v = totalCount !== 0
    const startPost = res.startPost[0]
    const endPost = res.endPost[0]
    const lastPost = res.posts?.slice(-1)[0]

    const hasNextPage = endPost?.createdAt !== lastPost?.createdAt && endPost?.createdAt !== after && res.posts.length === first && totalCount !== first
    const hasPreviousPage = after !== startPost?.createdAt && !!after

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      edges: edgifyByCreatedAt(res.posts ?? []),
      pageInfo: {
        endCursor: atob(lastPost?.createdAt),
        startCursor: atob(res.posts[0]?.createdAt),
        hasNextPage: hasNextPage && v,
        hasPreviousPage: hasPreviousPage && v
      }
    }
  }

  async findPostsByXidWithRelay (viewerId: string, xid: string, { after, first, orderBy, last, before }: RelayPagingConfigArgs) {
    after = btoa(after)
    before = btoa(before)

    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.findPostsByXidWithRelayForward(viewerId, xid, first, after)
    }
  }

  async findPostsByUid (viewerId: string, id: string, first: number, offset: number): Promise<PostsConnection> {
    if (viewerId === id) {
      const query = `
        query v($uid: string) {
          me(func: uid($uid)) @filter(type(User)) {
            postsCount: count(posts @filter(type(Post)))
            posts (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Post)) {
              id: uid
              expand(_all_)
            }
          }
        }
      `
      const res = await this.dbService.commitQuery<{me: Array<{postsCount: number, posts?: Post[]}>}>({ query, vars: { $uid: id } })
      return {
        totalCount: res.me[0]?.postsCount ?? 0,
        nodes: res.me[0]?.posts ?? []
      }
    }

    // 不返回匿名帖子和已删除的帖子
    const query = `
      query v($uid: string) {
        var(func: uid($uid)) @filter(type(User)) {
          posts @filter(type(Post) and not has(delete) and not has(anonymous)) {
            posts as uid
          }
        }
        totalCount(func: uid(posts)) {
          count(uid)
        }
        posts(func: uid(posts), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
          id: uid
          expand(_all_)
        } 
      }
    `
    const res = await this.dbService.commitQuery<{totalCount: Array<{count: number}>, posts: Post[]}>({ query, vars: { $uid: id } })
    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.posts ?? []
    }
  }

  async getRandomUserId (): Promise<string> {
    while (1) {
      const userId = randomUUID()
      const query = `
        query c($userId: string) {
          v(func: eq(userId, $userId)) @filter(type(User) or type(Admin)) {
            count(uid)
          }
        }
      `
      const res = await this.dbService.commitQuery<{v: Array<{count: number}>}>({ query, vars: { $userId: userId } })

      if ((res.v[0]?.count ?? 0) === 0) {
        return userId
      }
    }
  }

  async getUserOrAdminWithRolesByUid (id: string): Promise<UserWithRolesAndPrivilegesAndCredential> {
    const query = `
        query v($uid: string) {
          user(func: uid($uid)) @filter(type(User) OR type(Admin)) {
            id: uid
            expand(_all_)
            privileges @filter(type(Privilege)) {
              id: uid
              expand(_all_)
            }
            credential @filter(type(Credential)) {
              id: uid
            }
            roles: dgraph.type
          }
        }
      `
    const res = await this.dbService.commitQuery<{user: UserWithRolesAndPrivilegesAndCredential[]}>({ query, vars: { $uid: id } })

    if (res.user.length !== 1) {
      throw new ForbiddenException(`用户或管理员 ${id} 不存在`)
    }
    return res.user[0]
  }

  async registerUser (input: RegisterUserArgs): Promise<User> {
    if (!input.userId) {
      input.userId = await this.getRandomUserId()
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
    const mutation = {
      uid: '_:user',
      'dgraph.type': 'User',
      userId: input.userId,
      sign: input.sign,
      name: input.name,
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
      throw new UserIdExistException(input.userId)
    }

    return {
      id: uid,
      name: input.name,
      userId: input.userId,
      openId,
      unionId,
      createdAt: now,
      updatedAt: now,
      lastLoginedAt: now
    }
  }

  async updateUser (id: string, args: UpdateUserArgs) {
    if (Object.entries(args).length === 0) {
      throw new ForbiddenException('参数不能为空')
    }
    const _now = now()
    const query = `
      query v($id: string, $userId: string) {
        system(func: eq(userId, "system")) {
          system as uid
        }
        v(func: eq(userId, $userId)) @filter(type(Admin) or type(User)) { v as uid }
        u(func: uid($id)) @filter(type(User)) { 
          u as uid
          school as school
          grade as grade
          gender as gender
          subCampus as subCampus
          college as college
        }
        var(func: uid(u)) {
          val(school)
          val(grade)
          val(gender)
          val(subCampus)
          val(college)
        }
        user(func: uid(u)) @filter(type(User)) {
          id: uid
          credential @filter(type(Credential)) {
            c as uid
          }
          expand(_all_)
        }
        c(func: uid(c)) { uid }
      }
    `
    const updateCondition = '@if( eq(len(u), 1) and eq(len(c), 1) and eq(len(system), 1) and eq(len(v), 0) )'
    const updateMutation = {
      uid: id,
      updatedAt: _now
    }

    args.name && ((updateMutation as any).name = args.name)
    args.sign && ((updateMutation as any).sign = args.sign)
    args.userId && Object.assign(updateMutation, {
      userId: args.userId
    })
    args.avatarImageUrl && Object.assign(updateMutation, {
      avatarImageUrl: args.avatarImageUrl
    })
    'isCollegePrivate' in args && Object.assign(updateMutation, {
      'college|private': args.isCollegePrivate,
      college: 'val(college)'
    })
    'isGenderPrivate' in args && Object.assign(updateMutation, {
      'gender|private': args.isGenderPrivate,
      gender: 'val(gender)'
    })
    'isGradePrivate' in args && Object.assign(updateMutation, {
      'grade|private': args.isGradePrivate,
      grade: 'val(grade)'
    })
    'isSchoolPrivate' in args && Object.assign(updateMutation, {
      'school|private': args.isSchoolPrivate,
      school: 'val(school)'
    })
    'isSubCampusPrivate' in args && Object.assign(updateMutation, {
      'subCampus|private': args.isSubCampusPrivate,
      subCampus: 'val(subCampus)'
    })

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      user: User[]
      system: Array<{uid: string}>
      c: Array<{uid: string}>
    }>({
      mutations: [
        { mutation: updateMutation, condition: updateCondition }
      ],
      query,
      vars: {
        $id: id,
        $userId: args.userId
      }
    })

    Object.assign(res.json.user[0], args)
    if (res.json.v.length !== 0) {
      throw new UserIdExistException(args.userId)
    }
    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (res.json.system.length !== 1) {
      throw new SystemAdminNotFoundException()
    }
    if (res.json.c.length !== 1) {
      throw new UserNotAuthenException(id)
    }
    return res.json.user[0]
  }
}
