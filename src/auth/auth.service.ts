import { ForbiddenException, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import dgraph, { Mutation, Request } from 'dgraph-js'

import {
  AuthenticationInfo,
  CheckUserResult,
  CODE2SESSION_GRANT_TYPE,
  LoginResult,
  User
} from 'src/user/models/user.model'

import { AdminService } from '../admin/admin.service'
import {
  AdminNotFoundException,
  InstituteNotAllExistException,
  InstitutesOrSubCampusesNotAllInTheUniversityException,
  RolesNotAllExistException,
  SubCampusNotAllExistException,
  SystemAdminNotFoundException,
  SystemErrorException,
  UnionIdBeNullException,
  UniversityNotAllExistException,
  UserHadAuthenedException,
  UserHadSubmitAuthenInfoException,
  UserNotFoundException
} from '../app.exception'
import { ORDER_BY } from '../connections/models/connections.model'
import { ICredential } from '../credentials/models/credentials.model'
import { DbService } from '../db/db.service'
import { Delete } from '../deletes/models/deletes.model'
import { LESSON_NOTIFY_STATE } from '../lessons/models/lessons.model'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import {
  atob,
  code2Session,
  getAuthenticationInfo,
  ids2String,
  now,
  relayfyArrayForward
} from '../tool'
import { UserService } from '../user/user.service'
import {
  LoginByCodeArgs,
  Payload,
  UpdatePasswordResultUnion,
  UserAuthenInfo,
  UserWithRoles
} from './model/auth.model'

@Injectable()
export class AuthService {
  constructor (
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly adminService: AdminService,
    private readonly dbService: DbService
  ) {}

  async updatePassword (id: string, v: string) {
    const query = `
      query v($id: string, $sign: string) {
        u(func: uid($id)) @filter(type(User) or type(Admin)) {
          id: u as uid
          expand(_all_)
          # need for transfer current object into UserAndAdminUnion
          dgraph.type
        }
      }
    `
    const condition = '@if( eq(len(u), 1) )'
    const mutation = {
      uid: 'uid(u)',
      sign: v
    }
    const res = await this.dbService.commitConditionalUperts<
    Map<string, string>,
    {
      u: Array<typeof UpdatePasswordResultUnion>
    }
    >({
      query,
      mutations: [{ mutation, condition }],
      vars: { $id: id, $sign: v }
    })

    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }

    return res.json.u[0]
  }

  async delete (id: string) {
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(UserAuthenInfo)) {
          d as delete @filter(type(Delete))
        }
        delete(func: uid(d)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{ delete: Delete[] }>({
      query,
      vars: { $id: id }
    })
    return res.delete[0]
  }

  async to (id: string) {
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(UserAuthenInfo)) {
          u as to @filter(type(User))
        }
        user(func: uid(u)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{ user: User[] }>({
      query,
      vars: { $id: id }
    })

    return res.user[0]
  }

  async authenUser (id: string, to: string) {
    const now = new Date().toISOString()
    const query = `
      query v($adminId: string, $to: string) {
        # 授权的管理员存在
        v(func: uid($adminId)) @filter(type(Admin)) { v as uid }
        # 被授权的用户存在
        u(func: uid($to)) @filter(type(User)) { u as uid }
        # 授权者已认证
        x(func: uid($adminId)) @filter(type(Admin)) {
          credential @filter(type(Credential)) {
            x as uid
          }
        }
        # 被授权者未认证
        y(func: uid($to)) @filter(type(User)) {
          credential @filter(type(Credential)) {
            y as uid
          }
        }
      }
    `
    const condition =
      '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 1) and eq(len(y), 0) )'
    const mutation = {
      uid: '_:credential',
      'dgraph.type': 'Credential',
      createdAt: now,
      to: {
        uid: to,
        credential: {
          uid: '_:credential'
        }
      },
      creator: {
        uid: id,
        credentials: {
          uid: '_:credential'
        }
      }
    }

    const res = await this.dbService.commitConditionalUperts<
    Map<string, string>,
    {
      v: Array<{ uid: string }>
      u: Array<{ uid: string }>
      x: Array<{ credential: { uid: string } }>
      y: Array<{ credential: { uid: string } }>
    }
    >({
      query,
      mutations: [{ mutation, condition }],
      vars: {
        $adminId: id,
        $to: to
      }
    })

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`管理员 ${id} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`用户 ${to} 不存在`)
    }
    if (res.json.x.length !== 1) {
      throw new ForbiddenException(`管理员 ${id} 未认证`)
    }
    if (res.json.y.length !== 0) {
      throw new ForbiddenException(`用户 ${to} 已认证`)
    }

    return {
      createdAt: now,
      id: res.uids.get('credential')
    }
  }

  /**
   * 授权一个已注册管理员
   * @param i 已授权的管理员
   * @param to 未授权的管理员
   * @returns {Promise<Credential>}
   */
  async authenAdmin (i: string, to: string): Promise<ICredential> {
    if (i === to) {
      throw new ForbiddenException('不能对自己授权')
    }
    const now = new Date().toISOString()

    // 1. 当前认证的管理员存在
    // 2. 当前管理员已被认证
    // 3. 被认证的管理员存在
    // 4. 被认证的管理员未被认证
    const condition1 =
      '@if( eq(len(x), 0) and eq(len(v), 1) and eq(len(u), 1) and eq(len(q), 1) )'

    // 当前授权者是system
    const condition2 =
      '@if( eq(len(x), 0) and eq(len(v), 1) and eq(len(u), 1) and eq(len(s), 1) )'
    const query = `
          query v($i: string, $to: string) {
            # 授权者存在
            v(func: uid($i)) @filter(type(Admin)) { v as uid }
            # 被授权者存在
            u(func: uid($to)) @filter(type(Admin)) { u as uid }
            # 授权者是system
            s(func: uid($i)) @filter(type(Admin) and eq(userId, "system") and uid($i)) { s as uid }
            # 被授权者的授权
            x(func: uid($to)) @filter(type(Admin)) { 
              credential @filter(type(Credential)) {
                x as uid
              }
            }
            # 授权者的授权
            q(func: uid($i)) @filter(type(Admin)) {
              credential @filter(type(Credential)) {
                q as uid
              }
            }
          }
        `
    const mutation = {
      uid: '_:credential',
      'dgraph.type': 'Credential',
      createdAt: now,
      to: {
        uid: to,
        credential: {
          uid: '_:credential'
        }
      },
      creator: {
        uid: i,
        credentials: {
          uid: '_:credential'
        }
      }
    }
    const res = await this.dbService.commitConditionalUperts<
    Map<string, string>,
    {
      v: Array<{ uid: string }>
      u: Array<{ uid: string }>
      s: Array<{ uid: string }>
      x: Array<{ credential: { uid: string } }>
      q: Array<{ credential: { uid: string } }>
    }
    >({
      mutations: [
        { mutation, condition: condition1 },
        { mutation, condition: condition2 }
      ],
      query,
      vars: {
        $i: i,
        $to: to
      }
    })

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`授权者 ${i} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`管理员 ${to} 不存在`)
    }
    if (res.json.x.length !== 0) {
      throw new ForbiddenException(`管理员 ${to} 已被认证`)
    }
    if (res.json.q.length === 0 && res.json.s.length === 0) {
      throw new ForbiddenException(`授权者 ${i} 未认证`)
    }

    const id = res.uids.get('credential')
    if (!id) {
      throw new SystemErrorException()
    }

    return {
      id,
      createdAt: now
    }
  }

  /**
   * 管理员直接将认证信息附加到 User
   * @param actorId 管理员id
   * @param id 用户id
   * @param info 认证信息
   */
  async authenticateUser (
    adminId: string,
    id: string,
    info: AuthenticationInfo
  ): Promise<User> {
    const txn = this.dbService.getDgraphIns().newTxn()
    try {
      const user = await this.updateUserBaseInfoTxn(id, info, txn)
      await this.addCredentialToUserTxn(id, txn, adminId)
      await this.removeUserAuthenInfoTxn(id, txn)
      await this.addUniversitiesToUserTxn(id, info, txn)
      await this.addInstitutesToUserTxn(id, info, txn)
      await this.addSubCampusesToUserTxn(id, info, txn)
      await this.addRolesToUserTxn(id, info, txn)

      await txn.commit()
      return user
    } finally {
      await txn.discard()
    }
  }

  /**
   * 将 avatarImageUrl, gender, grade, name, studentId, updatedAt 更新到 User 对象
   * @param id 待更新信息的用户的id
   * @param info AuthenticationInfo
   * @param txn Txn
   * @returns {Promise<User>}
   */
  async updateUserBaseInfoTxn (
    id: string,
    info: AuthenticationInfo,
    txn: dgraph.Txn
  ): Promise<User> {
    const { avatarImageUrl, gender, grade, name, studentId } = info
    const query = `
      query v($userId: string) {
        u(func: uid($userId)) @filter(type(User)) { u as uid }
        user(func: uid(u)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const condition = '@if( eq(len(u), 1) )'
    const mutation = {
      uid: 'uid(u)',
      avatarImageUrl,
      gender,
      grade,
      name,
      studentId,
      updatedAt: now()
    }

    const mutate = new Mutation()
    mutate.setSetJson(mutation)
    mutate.setCond(condition)

    const request = new Request()
    const vars = request.getVarsMap()
    vars.set('$userId', id)
    request.setQuery(query)
    request.addMutations(mutate)

    const res = await txn.doRequest(request)

    const json = res.getJson() as unknown as {
      user: User[]
    }

    Object.assign(json.user[0], info)

    return json.user[0]
  }

  async addCredentialToUserTxn (id: string, txn: dgraph.Txn, adminId?: string) {
    const q1 = `a(func: uid(${
      adminId ?? ''
    })) @filter(type(Admin)) { a as uid }`
    const q2 =
      'a(func: eq(userId, "system")) @filter(type(Admin)) { a as uid }'
    const query = `
      query v($userId: string) {
        ${adminId ? q1 : q2}
        u(func: uid($userId)) @filter(type(User)) { 
          u as uid
          yy as credential
        }
        c(func: uid(yy)) @filter(type(Credential)) { c as uid }
      }
    `
    const condition =
      '@if( eq(len(u), 1) and eq(len(a), 1) and eq(len(c), 0) )'
    const mutation = {
      uid: 'uid(u)',
      credential: {
        uid: '_:credential',
        'dgraph.type': 'Credential',
        createdAt: now(),
        creator: {
          uid: 'uid(a)',
          credentials: {
            uid: '_:credential'
          }
        },
        to: {
          uid: 'uid(u)'
        }
      }
    }

    const mutate = new Mutation()
    mutate.setSetJson(mutation)
    mutate.setCond(condition)

    const request = new Request()
    const vars = request.getVarsMap()
    vars.set('$userId', id)
    request.setQuery(query)
    request.addMutations(mutate)

    const res = await txn.doRequest(request)
    const json = res.getJson() as unknown as {
      a: Array<{ uid: string }>
      u: Array<{ uid: string }>
      c: Array<{ uid: string }>
    }

    if (json.a.length !== 1) {
      throw new AdminNotFoundException(adminId ?? '')
    }
    if (json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (json.c.length !== 0) {
      throw new UserHadAuthenedException(id)
    }
  }

  async removeUserAuthenInfoTxn (id: string, txn: dgraph.Txn) {
    const query = `
      query v($userId: string) {
        s(func: eq(userId, "system")) @filter(type(Admin)) { system as uid }
        u(func: uid($userId)) @filter(type(User)) { u as uid }
        i(func: type(UserAuthenInfo)) @filter(uid_in(to, $userId) and not has(delete)) {
          i as uid
        }
      }
    `
    const condition = '@if( eq(len(u), 1) and not eq(len(i), 0) )'
    const mutation = {
      uid: 'uid(i)',
      delete: {
        uid: '_:delete',
        'dgraph.type': 'Delete',
        createdAt: now(),
        description: '系统自动删除无效的UserAuthenInfo',
        creator: {
          uid: 'uid(system)',
          deletes: {
            uid: '_:delete'
          }
        },
        to: {
          uid: 'uid(i)'
        }
      }
    }

    const mutate = new Mutation()
    mutate.setSetJson(mutation)
    mutate.setCond(condition)

    const request = new Request()
    const vars = request.getVarsMap()
    vars.set('$userId', id)
    request.setQuery(query)
    request.addMutations(mutate)

    const res = await txn.doRequest(request)
    const json = res.getJson() as unknown as {
      s: Array<{ uid: string }>
    }

    if (json.s.length !== 1) {
      throw new SystemAdminNotFoundException()
    }
  }

  async addUniversitiesToUserTxn (
    id: string,
    info: AuthenticationInfo,
    txn: dgraph.Txn
  ) {
    const { universities } = info
    const len = universities.length
    const str = ids2String(universities)

    const query = `
      query v($userId: string) {
        u(func: uid($userId)) @filter(type(User)) { u as uid }
        universities(func: uid(${str})) @filter(type(University)) {
          universities as uid
        }
      }
    `

    const condition = `@if( eq(len(universities), ${len}) )`
    const mutation = {
      uid: 'uid(universities)',
      users: {
        uid: 'uid(u)'
      }
    }

    const mutate = new Mutation()
    mutate.setSetJson(mutation)
    mutate.setCond(condition)

    const request = new Request()
    const vars = request.getVarsMap()
    vars.set('$userId', id)
    request.setQuery(query)
    request.addMutations(mutate)

    const res = await txn.doRequest(request)
    const json = res.getJson() as unknown as {
      universities: Array<{ uid: string }>
    }

    if (json.universities.length !== len) {
      throw new UniversityNotAllExistException(universities)
    }
  }

  async addInstitutesToUserTxn (
    id: string,
    info: AuthenticationInfo,
    txn: dgraph.Txn
  ) {
    const { institutes, universities } = info
    const len = institutes.length
    const str = ids2String(institutes)
    const universitiesIds = ids2String(universities)

    const query = `
      query v($userId: string) {
        u(func: uid($userId)) @filter(type(User)) { u as uid }
        var(func: uid(${universitiesIds})) @filter(type(University)) {
          ins as institutes @filter(type(Institute))
        }
        institutes(func: uid(${str})) @filter(uid(ins)) {
          institutes as uid
        }
      }
    `

    const condition = `@if( eq(len(institutes), ${len}) )`
    const mutation = {
      uid: 'uid(institutes)',
      users: {
        uid: 'uid(u)'
      }
    }

    const mutate = new Mutation()
    mutate.setSetJson(mutation)
    mutate.setCond(condition)

    const request = new Request()
    const vars = request.getVarsMap()
    vars.set('$userId', id)
    request.setQuery(query)
    request.addMutations(mutate)

    const res = await txn.doRequest(request)
    const json = res.getJson() as unknown as {
      institutes: Array<{ uid: string }>
    }

    if (json.institutes.length !== len) {
      throw new InstituteNotAllExistException(institutes)
    }
  }

  async addSubCampusesToUserTxn (
    id: string,
    info: AuthenticationInfo,
    txn: dgraph.Txn
  ) {
    const { subCampuses, universities } = info
    const len = subCampuses.length
    const str = ids2String(subCampuses)
    const universitiesIds = ids2String(universities)

    const query = `
      query v($userId: string) {
        u(func: uid($userId)) @filter(type(User)) { u as uid }
        var(func: uid(${universitiesIds})) @filter(type(University)) {
          sub as subCampuses @filter(type(SubCampus))
        }
        subCampuses(func: uid(${str})) @filter(uid(sub)) {
          subCampuses as uid
        }
      }
    `

    const condition = `@if( eq(len(subCampuses), ${len}) )`
    const mutation = {
      uid: 'uid(subCampuses)',
      users: {
        uid: 'uid(u)'
      }
    }

    const mutate = new Mutation()
    mutate.setSetJson(mutation)
    mutate.setCond(condition)

    const request = new Request()
    const vars = request.getVarsMap()
    vars.set('$userId', id)
    request.setQuery(query)
    request.addMutations(mutate)

    const res = await txn.doRequest(request)
    const json = res.getJson() as unknown as {
      subCampuses: Array<{ uid: string }>
    }

    if (json.subCampuses.length !== len) {
      throw new SubCampusNotAllExistException(subCampuses)
    }
  }

  async addRolesToUserTxn (
    id: string,
    info: AuthenticationInfo,
    txn: dgraph.Txn
  ) {
    const { roles } = info
    const len = roles?.length ?? 0
    const str = ids2String(roles)

    const _roles = roles?.map(r => ({
      uid: r,
      users: {
        uid: 'uid(u)'
      }
    }))

    const query = `
      query v($userId: string) {
        u(func: uid($userId)) @filter(type(User)) { u as uid }
        roles(func: uid(${str})) @filter(type(Role)) { r as uid }
      }
    `

    const condition = `@if( eq(len(u), 1) and eq(len(r), ${len}) )`
    const mutation = {
      uid: 'uid(u)',
      roles: _roles
    }

    const mutate = new Mutation()
    mutate.setSetJson(mutation)
    mutate.setCond(condition)

    const request = new Request()
    const vars = request.getVarsMap()
    vars.set('$userId', id)
    request.setQuery(query)
    request.addMutations(mutate)

    const res = await txn.doRequest(request)
    const json = res.getJson() as unknown as {
      roles: Array<{ uid: string }>
    }

    if (json.roles.length !== len) {
      throw new RolesNotAllExistException(roles ?? [])
    }
  }

  /**
   * User 提交待审核的信息到审核列表
   * @param id 待认证的 User
   * @param info 认证信息
   * @returns Promise<User>
   */
  async addInfoForAuthenUser (
    id: string,
    info: AuthenticationInfo
  ): Promise<User> {
    const roleIds = info.roles
    const roleIdsLen = info.roles?.length ?? 0
    const roleIdsStr = ids2String(info.roles)

    const universitiyIds = info.universities
    const instituteIds = info.institutes
    const subCampusIds = info.subCampuses
    const universitiesLen = info.universities.length
    const institutesLen = info.institutes.length
    const subCampusesLen = info.subCampuses.length
    const universitiesStr = ids2String(info.universities)
    const institutesStr = ids2String(info.institutes)
    const subCampusesStr = ids2String(info.subCampuses)

    const query = `
      query v($id: string) {
        x(func: uid(${roleIdsStr})) @filter(type(Role)) { x as uid }
        v(func: uid($id)) @filter(type(User)) { v as uid }
        u(func: type(UserAuthenInfo)) @filter(uid_in(to, $id) and not has(delete)) {
          u as uid
        }
        # User是否已认证
        i(func: uid(v)) {
          credential @filter(type(Credential)) {
            i as uid
          }
        }
        # User 申请的 Universities
        universities(func: uid(${universitiesStr})) @filter(type(University)) {
          universities as uid
        }
        # User 申请的 Institutes
        institutes(func: uid(${institutesStr})) @filter(type(Institute)) {
          institutes as uid
          universitiesOfInstitutes as ~institutes @filter(type(University))
        }
        # User 申请的 SubCampuses
        subCampuses(func: uid(${subCampusesStr})) @filter(type(SubCampus)) {
          subCampuses as uid
          universitiesOfSubCampuses as ~subCampuses @filter(type(University))
        }
        # Institutes 和 SubCampuses 对应的 University 的数组是否与申请的 Universities 相同
        k(func: uid(universities)) @filter(not uid(universitiesOfInstitutes, universitiesOfSubCampuses)) {
          k as uid
        }
        user(func: uid(v)) {
          id: uid
          expand(_all_)
        }
      }
    `

    delete info.roles
    delete (info as any).universities
    delete (info as any).institutes
    delete (info as any).subCampuses

    const condition = `@if( eq(len(v), 1) and eq(len(u), 0) and eq(len(i), 0) and eq(len(x), ${roleIdsLen}) )`
    const mutation = {
      uid: '_:user-authen-info',
      'dgraph.type': 'UserAuthenInfo',
      createdAt: now(),
      ...info,
      to: {
        uid: id
      }
    }

    // 添加 Universities, Institutes, SubCampuses 到 UserAuthenInfo
    const subCondition = `@if( eq(len(k), 0) and eq(len(universities), ${universitiesLen}) and eq(len(institutes), ${institutesLen}) and eq(len(subCampuses), ${subCampusesLen}) )`
    const subMutation = {
      uid: '_:user-authen-info',
      'dgraph.type': 'UserAuthenInfo',
      universities: {
        uid: 'uid(universities)'
      },
      institutes: {
        uid: 'uid(institutes)'
      },
      subCampuses: {
        uid: 'uid(subCampuses)'
      }
    }

    const withRolesCondition = `@if( eq(len(v), 1) and eq(len(u), 0) and eq(len(i), 0) and eq(len(x), ${roleIdsLen}) )`
    const withRolesMutation = {
      uid: '_:user-authen-info',
      'dgraph.type': 'UserAuthenInfo',
      roles: {
        uid: 'uid(x)'
      }
    }

    const res = await this.dbService.commitConditionalUperts<
    Map<string, string>,
    {
      v: Array<{ uid: string }>
      u: Array<{ uid: string }>
      x: Array<{ uid: string }>
      i: Array<{ uid: string }>
      k: Array<{ uid: string }>
      universities: Array<{ uid: string }>
      institutes: Array<{ uid: string }>
      subCampuses: Array<{ uid: string }>
      user: User[]
    }
    >({
      query,
      mutations: [
        { mutation, condition },
        { mutation: subMutation, condition: subCondition },
        { mutation: withRolesMutation, condition: withRolesCondition }
      ],
      vars: { $id: id }
    })

    if (res.json.v.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (res.json.u.length !== 0) {
      throw new UserHadSubmitAuthenInfoException(id)
    }
    if (res.json.x.length !== roleIdsLen) {
      throw new RolesNotAllExistException(roleIds ?? [])
    }
    if (res.json.i.length !== 0) {
      throw new UserHadAuthenedException(id)
    }
    if (res.json.universities.length !== universitiesLen) {
      throw new UniversityNotAllExistException(universitiyIds)
    }
    if (res.json.institutes.length !== institutesLen) {
      throw new InstituteNotAllExistException(instituteIds)
    }
    if (res.json.subCampuses.length !== subCampusesLen) {
      throw new SubCampusNotAllExistException(subCampusIds)
    }
    if (res.json.k.length !== 0) {
      throw new InstitutesOrSubCampusesNotAllInTheUniversityException(
        instituteIds,
        subCampusIds,
        universitiyIds
      )
    }

    return res.json.user[0]
  }

  /**
   * 用户从可信通道自我认证，比如从校园网提供自己的学生信息
   * @param id 用户id
   * @param token token
   */
  async autoAuthenUserSelf (id: string, token: string): Promise<User> {
    // 测试并解析 token
    const tokenRes = getAuthenticationInfo(token)
    const txn = this.dbService.getDgraphIns().newTxn()
    try {
      const user = await this.updateUserBaseInfoTxn(id, tokenRes, txn)
      await this.addCredentialToUserTxn(id, txn)
      await this.removeUserAuthenInfoTxn(id, txn)
      await this.addUniversitiesToUserTxn(id, tokenRes, txn)
      await this.addInstitutesToUserTxn(id, tokenRes, txn)
      await this.addSubCampusesToUserTxn(id, tokenRes, txn)
      await this.addRolesToUserTxn(id, tokenRes, txn)

      await txn.commit()
      return user
    } finally {
      await txn.discard()
    }
  }

  async userAuthenInfos ({
    orderBy,
    first,
    after,
    last,
    before
  }: RelayPagingConfigArgs) {
    after = atob(after)
    before = atob(before)
    if (orderBy === ORDER_BY.CREATED_AT_DESC && first) {
      return await this.userAuthenInfosRelayForward(first, after)
    }
    throw new Error('Method not implemented.')
  }

  async userAuthenInfosRelayForward (first: number, after: string | null) {
    const q1 =
      'var(func: uid(infos), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid } '
    const query = `
      query v($after: string) {
        infos as var(func: type(UserAuthenInfo), orderdesc: createdAt) @filter(not has(delete) and has(avatarImageUrl))

        ${after ? q1 : ''}
        totalCount(func: uid(infos)) {
          count(uid)
        }
        infos(func: uid(${
          after ? 'q1' : 'infos'
        }), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startInfo(func: uid(infos), first: -1) {
          createdAt
        }
        # 结束游标
        endInfo(func: uid(infos), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{ count: number }>
      startInfo: Array<{ createdAt: string }>
      endInfo: Array<{ createdAt: string }>
      infos: UserAuthenInfo[]
    }>({ query, vars: { $after: after } })

    return relayfyArrayForward({
      totalCount: res.totalCount,
      startO: res.startInfo,
      endO: res.endInfo,
      objs: res.infos,
      first,
      after
    })
  }

  async login (
    userId: string | undefined | null,
    id: string | undefined | null,
    sign: string
  ): Promise<LoginResult> {
    const user = await this.checkUserPasswordAndGetUser(userId, id, sign)
    const payload: Payload = { id: user.id, roles: user.roles }
    return {
      token: this.jwtService.sign(payload),
      ...user
    }
  }

  async checkUserPasswordAndGetUser (
    userId: string | undefined | null,
    id: string | undefined | null,
    sign: string
  ) {
    if (userId && userId.length <= 2) {
      throw new ForbiddenException('userId 不能少于3个字符')
    }
    if (!userId && !id) {
      throw new ForbiddenException('userId 和 id 不能同时为空')
    }
    const query = userId
      ? `
      query v($sign: string, $userId: string, $id: string) {
        user(func: eq(userId, $userId)) @filter(type(User) OR type(Admin)) {
          id: t as uid
          expand(_all_)
          success: checkpwd(sign, $sign)
          roles: dgraph.type
        }
      }
      `
      : `
      query v($sign: string, $userId: string, $id: string) {
        user(func: uid($id)) @filter(type(User) or type(Admin)) {
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
    const res = await this.dbService.commitConditionalUperts<
    Map<string, string>,
    { user: CheckUserResult[] }
    >({
      query,
      vars: {
        $userId: userId,
        $sign: sign,
        $id: id
      },
      mutations: [{ mutation, condition }]
    })

    if (res.json.user.length !== 1 || !res.json.user[0].success) {
      throw new ForbiddenException('userId 或 id 或密码错误')
    }
    Object.assign(res.json.user[0], {
      lastLoginedAt: now
    })

    return res.json.user[0]
  }

  async loginByCode (args: LoginByCodeArgs) {
    const user = await this.checkUserByCode(args)
    const payload: Payload = { id: user.id, roles: user.roles }
    return {
      token: this.jwtService.sign(payload),
      ...user
    }
  }

  async checkUserByCode ({ code, grantType }: LoginByCodeArgs) {
    const { openId, unionId } = await code2Session(code, grantType)
    if (!unionId || unionId === '') {
      throw new UnionIdBeNullException()
    }
    const _now = now()
    const query = `
      query v($unionId: string) {
        user(func: type(User)) @filter(eq(unionId, $unionId)) {
          id: v as uid
          expand(_all_)
          roles: dgraph.type
          status as lessonNotificationStatus @filter(type(LessonNotificationState))
        }
      }
    `
    const condition = '@if( eq(len(v), 1) )'
    const mutation = {
      uid: 'uid(v)',
      lastLoginedAt: _now
    }

    const cond = '@if( eq(len(status), 0) )'
    const condMutation = {
      uid: 'uid(v)',
      lessonNotificationStatus: {
        uid: '_:status',
        'dgraph.type': 'LessonNotificationStatus',
        state: LESSON_NOTIFY_STATE.FAILED,
        lastNotifiedAt: now()
      }
    }
    if (grantType === CODE2SESSION_GRANT_TYPE.BLANK_SPACE) {
      Object.assign(mutation, { blankspaceOpenId: openId })
    }
    if (grantType === CODE2SESSION_GRANT_TYPE.CURRICULUM) {
      Object.assign(mutation, { blankspaceAssistantOpenId: openId })
    }

    const res = await this.dbService.commitConditionalUperts<
    Map<string, string>,
    {
      user: UserWithRoles[]
    }
    >({
      mutations: [
        { mutation, condition },
        { mutation: condMutation, condition: cond }
      ],
      vars: { $unionId: unionId },
      query
    })

    return res.json.user[0]
  }
}
