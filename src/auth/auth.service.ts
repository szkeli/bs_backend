import { ForbiddenException, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { AuthenticationInfo, CheckUserResult, CODE2SESSION_GRANT_TYPE, LoginResult, User } from 'src/user/models/user.model'

import { AdminService } from '../admin/admin.service'
import { AdminNotFoundException, InstituteNotAllExistException, InstitutesOrSubCampusesNotAllInTheUniversityException, RolesNotAllExistException, SubCampusNotAllExistException, SystemAdminNotFoundException, UnionIdBeNullException, UniversityNotAllExistException, UserHadAuthenedException, UserHadSubmitAuthenInfoException, UserNotFoundException } from '../app.exception'
import { ORDER_BY } from '../connections/models/connections.model'
import { ICredential } from '../credentials/models/credentials.model'
import { DbService } from '../db/db.service'
import { Delete } from '../deletes/models/deletes.model'
import { LESSON_NOTIFY_STATE } from '../lessons/models/lessons.model'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { Role } from '../roles/models/roles.model'
import { atob, btoa, code2Session, getAuthenticationInfo, ids2String, now, relayfyArrayForward } from '../tool'
import { UserService } from '../user/user.service'
import { LoginByCodeArgs, Payload, UpdatePasswordResultUnion, UserAuthenInfo, UserWithRoles } from './model/auth.model'

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
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      u: Array<typeof UpdatePasswordResultUnion>
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: { $id: id, $sign: v }
    })

    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }

    return res.json.u[0]
  }

  async roles (id: string, { after, first, orderBy }: RelayPagingConfigArgs) {
    after = btoa(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.rolesWithRelayForword(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async rolesWithRelayForword (id: string, first: number, after: string) {
    const q1 = 'var(func: uid(roles), orderdesc: createdAt) @filter(lt(creaedtAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: after) {
        var(func: uid($id)) @filter(type(UserAuthenInfo)) {
          roles as roles (orderdesc: createdAt) @filter(type(Role))
        }
        ${after ? q1 : ''}
        totalCount(func: uid(roles)) { count(uid) }
        roles(func: uid(${after ? 'q' : 'roles'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # ????????????
        startRole(func: uid(roles), first: -1) {
          createdAt
        }
        # ????????????
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
    const res = await this.dbService.commitQuery<{delete: Delete[]}>({ query, vars: { $id: id } })
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
    const res = await this.dbService.commitQuery<{user: User[]}>({ query, vars: { $id: id } })

    return res.user[0]
  }

  async authenUser (id: string, to: string) {
    const now = new Date().toISOString()
    const query = `
      query v($adminId: string, $to: string) {
        # ????????????????????????
        v(func: uid($adminId)) @filter(type(Admin)) { v as uid }
        # ????????????????????????
        u(func: uid($to)) @filter(type(User)) { u as uid }
        # ??????????????????
        x(func: uid($adminId)) @filter(type(Admin)) {
          credential @filter(type(Credential)) {
            x as uid
          }
        }
        # ?????????????????????
        y(func: uid($to)) @filter(type(User)) {
          credential @filter(type(Credential)) {
            y as uid
          }
        }
      }
    `
    const condition = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 1) and eq(len(y), 0) )'
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

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{credential: {uid: string}}>
      y: Array<{credential: {uid: string}}>
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: {
        $adminId: id,
        $to: to
      }
    })

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`????????? ${id} ?????????`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`?????? ${to} ?????????`)
    }
    if (res.json.x.length !== 1) {
      throw new ForbiddenException(`????????? ${id} ?????????`)
    }
    if (res.json.y.length !== 0) {
      throw new ForbiddenException(`?????? ${to} ?????????`)
    }

    return {
      createdAt: now,
      id: res.uids.get('credential')
    }
  }

  /**
   * ??????????????????????????????
   * @param i ?????????????????????
   * @param to ?????????????????????
   * @returns {Promise<Credential>}
   */
  async authenAdmin (i: string, to: string): Promise<ICredential> {
    if (i === to) {
      throw new ForbiddenException('?????????????????????')
    }
    const now = new Date().toISOString()

    // 1. ??????????????????????????????
    // 2. ???????????????????????????
    // 3. ???????????????????????????
    // 4. ?????????????????????????????????
    const condition1 = '@if( eq(len(x), 0) and eq(len(v), 1) and eq(len(u), 1) and eq(len(q), 1) )'

    // ??????????????????system
    const condition2 = '@if( eq(len(x), 0) and eq(len(v), 1) and eq(len(u), 1) and eq(len(s), 1) )'
    const query = `
          query v($i: string, $to: string) {
            # ???????????????
            v(func: uid($i)) @filter(type(Admin)) { v as uid }
            # ??????????????????
            u(func: uid($to)) @filter(type(Admin)) { u as uid }
            # ????????????system
            s(func: uid($i)) @filter(type(Admin) and eq(userId, "system") and uid($i)) { s as uid }
            # ?????????????????????
            x(func: uid($to)) @filter(type(Admin)) { 
              credential @filter(type(Credential)) {
                x as uid
              }
            }
            # ??????????????????
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
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      s: Array<{uid: string}>
      x: Array<{credential: {uid: string}}>
      q: Array<{credential: {uid: string}}>
    }>({
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
      throw new ForbiddenException(`????????? ${i} ?????????`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`????????? ${to} ?????????`)
    }
    if (res.json.x.length !== 0) {
      throw new ForbiddenException(`????????? ${to} ????????????`)
    }
    if (res.json.q.length === 0 && res.json.s.length === 0) {
      throw new ForbiddenException(`????????? ${i} ?????????`)
    }

    return {
      createdAt: now,
      id: res.uids.get('credential')
    }
  }

  /**
   * ??????????????????????????????????????? User
   * @param actorId ?????????id
   * @param id ??????id
   * @param info ????????????
   */
  async authenticateUser (actorId: string, id: string, info: AuthenticationInfo) {
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

    // ???info??????????????????????????????credential??????
    const query = `
      query v($actorId: string, $id: string) {
        # ??????roleIds??????role??????
        x(func: uid(${roleIdsStr})) @filter(type(Role)) { x as uid }
        # ??????
        s(func: eq(userId, "system")) @filter(type(Admin)) { system as uid }
        # ?????????????????????
        v(func: uid($actorId)) @filter(type(Admin)) { v as uid }
        # ??????????????????
        u(func: uid($id)) @filter(type(User)) { u as uid }
        # ????????????????????????
        n(func: uid($id)) @filter(type(User)) {
          credential @filter(type(Credential)) {
            n as uid
          }
        }
        # User ????????? Universities
        universities(func: uid(${universitiesStr})) @filter(type(University)) {
          universities as uid
        }
        # User ????????? Institutes
        institutes(func: uid(${institutesStr})) @filter(type(Institute)) {
          institutes as uid
          universitiesOfInstitutes as ~institutes @filter(type(University))
        }
        # User ????????? SubCampuses
        subCampuses(func: uid(${subCampusesStr})) @filter(type(SubCampus)) {
          subCampuses as uid
          universitiesOfSubCampuses as ~subCampuses @filter(type(University))
        }
        # Institutes ??? SubCampuses ????????? University ??????????????????????????? Universities ??????
        k(func: uid(universities)) @filter(not uid(universitiesOfInstitutes, universitiesOfSubCampuses)) {
          k as uid
        }
        # ???????????????
        user(func: uid(u)) {
          id: uid
          expand(_all_)
        }
        # ???????????????????????????
        c(func: type(UserAuthenInfo)) @filter(uid_in(to, $id) and not has(delete)) { c as uid }
      }
    `

    delete info.images
    delete info.roles
    delete info.universities
    delete info.institutes
    delete info.subCampuses

    const condition = `@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(n), 0) and eq(len(x), ${roleIdsLen}) )`
    const mutation = {
      uid: id,
      'dgraph.type': 'User',
      updatedAt: now(),
      ...info,
      'school|private': false,
      'grade|private': false,
      'gender|private': false,
      'subCampus|private': false,
      'college|private': false,
      credential: {
        uid: '_:credential',
        'dgraph.type': 'Credential',
        createdAt: now(),
        creator: {
          uid: actorId,
          credentials: {
            uid: '_:credential'
          }
        },
        to: {
          uid: id,
          credential: {
            uid: '_:credential'
          }
        }
      }
    }

    const addUniversityCond = `@if( eq(len(k), 0) and eq(len(universities), ${universitiesLen}) )`
    const addUniversityMut = {
      uid: 'uid(universities)',
      users: {
        uid: 'uid(u)'
      }
    }
    const addInstituteCond = `@if( eq(len(k), 0) and eq(len(institutes), ${institutesLen}) )`
    const addInstituteMut = {
      uid: 'uid(institutes)',
      users: {
        uid: 'uid(u)'
      }
    }
    const addSubCampusCond = `@if( eq(len(k), 0) and eq(len(subCampuses), ${subCampusesLen}) )`
    const addSubCampusMut = {
      uid: 'uid(subCampuses)',
      users: {
        uid: 'uid(u)'
      }
    }

    if (roleIdsLen !== 0) {
      Object.assign(mutation, {
        roles: roleIds.map(r => ({
          uid: r,
          users: {
            uid: id
          }
        }))
      })
    }

    // ???????????????????????????????????????????????????????????????
    const deleteTheUserAuthenInfoCondi = `@if( eq(len(system), 1) and eq(len(v), 1) and eq(len(u), 1) and eq(len(n), 0) and eq(len(c), 1) and eq(len(x), ${roleIdsLen}) )`
    const addDeleteOnTheUserAuthenInfoMutation = {
      uid: 'uid(c)',
      delete: {
        uid: '_:delete',
        'dgraph.type': 'Delete',
        createdAt: now(),
        description: '???????????????????????????UserAuthenInfo',
        creator: {
          uid: 'uid(system)',
          deletes: {
            uid: '_:delete'
          }
        },
        to: {
          uid: 'uid(c)'
        }
      }
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      n: Array<{uid: string}>
      x: Array<{uid: string}>
      universities: Array<{uid: string}>
      institutes: Array<{uid: string}>
      subCampuses: Array<{uid: string}>
      k: Array<{uid: string}>
      user: User[]
    }>({
      query,
      mutations: [
        { mutation, condition },
        { mutation: addUniversityMut, condition: addUniversityCond },
        { mutation: addInstituteMut, condition: addInstituteCond },
        { mutation: addSubCampusMut, condition: addSubCampusCond },
        { mutation: addDeleteOnTheUserAuthenInfoMutation, condition: deleteTheUserAuthenInfoCondi }
      ],
      vars: { $actorId: actorId, $id: id }
    })

    if (res.json.v.length !== 1) {
      throw new AdminNotFoundException(actorId)
    }
    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (res.json.n.length !== 0) {
      throw new UserHadAuthenedException(id)
    }
    if (res.json.x.length !== roleIdsLen) {
      throw new RolesNotAllExistException(roleIds)
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
      throw new ForbiddenException('universities ?????????????????? institutes ??? subCampuses ????????? University')
    }

    const user = res.json.user[0]
    Object.assign(user, info)

    return user
  }

  /**
   * User ???????????????????????????????????????
   * @param id ???????????? User
   * @param info ????????????
   * @returns Promise<User>
   */
  async addInfoForAuthenUser (id: string, info: AuthenticationInfo): Promise<User> {
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
        # User???????????????
        i(func: uid(v)) {
          credential @filter(type(Credential)) {
            i as uid
          }
        }
        # User ????????? Universities
        universities(func: uid(${universitiesStr})) @filter(type(University)) {
          universities as uid
        }
        # User ????????? Institutes
        institutes(func: uid(${institutesStr})) @filter(type(Institute)) {
          institutes as uid
          universitiesOfInstitutes as ~institutes @filter(type(University))
        }
        # User ????????? SubCampuses
        subCampuses(func: uid(${subCampusesStr})) @filter(type(SubCampus)) {
          subCampuses as uid
          universitiesOfSubCampuses as ~subCampuses @filter(type(University))
        }
        # Institutes ??? SubCampuses ????????? University ??????????????????????????? Universities ??????
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
    delete info.universities
    delete info.institutes
    delete info.subCampuses

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

    // ?????? Universities, Institutes, SubCampuses ??? UserAuthenInfo
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

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{uid: string}>
      i: Array<{uid: string}>
      k: Array<{uid: string}>
      universities: Array<{uid: string}>
      institutes: Array<{uid: string}>
      subCampuses: Array<{uid: string}>
      user: User[]
    }>({
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
      throw new RolesNotAllExistException(roleIds)
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
      throw new InstitutesOrSubCampusesNotAllInTheUniversityException(instituteIds, subCampusIds, universitiyIds)
    }

    return res.json.user[0]
  }

  /**
   * ?????????????????????????????????????????????????????????????????????????????????
   * @param id ??????id
   * @param token token
   */
  async autoAuthenUserSelf (id: string, token: string) {
    // ???????????????token
    const tokenRes = getAuthenticationInfo(token)
    const roleIds = tokenRes.roles
    const roleIdsLen = roleIds?.length ?? 0
    const roleIdsStr = ids2String(roleIds)

    const universitiyIds = tokenRes.universities
    const instituteIds = tokenRes.institutes
    const subCampusIds = tokenRes.subCampuses
    const universitiesStr = ids2String(tokenRes.universities)
    const institutesStr = ids2String(tokenRes.institutes)
    const subCampusesStr = ids2String(tokenRes.subCampuses)
    const universitiesLen = tokenRes.universities.length
    const institutesLen = tokenRes.institutes.length
    const subCampusesLen = tokenRes.subCampuses.length

    const query = `
      query v($id: string) {
        # ?????? roleIds ?????? role ??????
        x(func: uid(${roleIdsStr})) @filter(type(Role)) { x as uid }
        # system ????????????
        s(func: eq(userId, "system")) @filter(type(Admin)) { system as uid }
        u(func: uid($id)) @filter(type(User)) { u as uid }
        # User ??????????????????
        v(func: uid($id)) @filter(type(User)) {
          credential @filter(type(Credential)) {
            v as uid
          }
        }
        # User ????????? Universities
        universities(func: uid(${universitiesStr})) @filter(type(University)) {
          universities as uid
        }
        # User ????????? Institutes
        institutes(func: uid(${institutesStr})) @filter(type(Institute)) {
          institutes as uid
          universitiesOfInstitutes as ~institutes @filter(type(University))
        }
        # User ????????? SubCampuses 
        subCampuses(func: uid(${subCampusesStr})) @filter(type(SubCampus)) {
          subCampuses as uid
          universitiesOfSubCampuses as ~subCampuses @filter(type(University))
        }
        # Institutes ??? SubCampuses ????????? University ??????????????????????????? Universities ??????
        k(func: uid(universities)) @filter(not uid(universitiesOfInstitutes, universitiesOfSubCampuses)) {
          k as uid
        }
        user(func: uid(u)) {
          id: uid
          expand(_all_)
        }
      }
    `

    delete tokenRes.roles
    delete tokenRes.universities
    delete tokenRes.institutes
    delete tokenRes.subCampuses

    // ?????? User ??????
    const condition = `@if( 
      eq(len(u), 1)
      and eq(len(v), 0) 
      and eq(len(system), 1) 
      and eq(len(x), ${roleIdsLen}) 
      and eq(len(k), 0) 
      and eq(len(universities), ${universitiesLen}) 
      and eq(len(institutes), ${institutesLen}) 
      and eq(len(subCampuses), ${subCampusesLen}) 
    )`
    // TODO school ??????????????????
    // ????????????????????????????????????????????????????????????????????????
    const mutation = {
      uid: id,
      ...tokenRes,
      updatedAt: now(),
      'school|private': false,
      'grade|private': false,
      'gender|private': false,
      'subCampus|private': false,
      'college|private': false,
      credential: {
        uid: '_:credential',
        'dgraph.type': 'Credential',
        createdAt: now(),
        creator: {
          uid: 'uid(system)',
          credentials: {
            uid: '_:credential'
          }
        },
        to: {
          uid: id,
          credential: {
            uid: '_:credential'
          }
        }
      }
    }

    // ??? User ?????????????????? Universities, Institutes, SubCampuses
    const addUniversityMut = {
      uid: 'uid(universities)',
      users: {
        uid: 'uid(u)'
      }
    }
    const addInstituteMut = {
      uid: 'uid(institutes)',
      users: {
        uid: 'uid(u)'
      }
    }
    const addSubCampusMut = {
      uid: 'uid(subCampuses)',
      users: {
        uid: 'uid(u)'
      }
    }

    if (roleIdsLen !== 0) {
      Object.assign(mutation, {
        roles: roleIds.map(r => ({
          uid: r,
          users: {
            uid: id
          }
        }))
      })
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      s: Array<{uid: string}>
      u: Array<{uid: string}>
      v: Array<{uid: string}>
      x: Array<{uid: string}>
      universities: Array<{uid: string}>
      institutes: Array<{uid: string}>
      subCampuses: Array<{uid: string}>
      k: Array<{uid: string}>
      user: User[]
    }>({
      query,
      mutations: [
        { mutation, condition },
        { mutation: addUniversityMut, condition },
        { mutation: addInstituteMut, condition },
        { mutation: addSubCampusMut, condition }
      ],
      vars: { $id: id }
    })

    if (res.json.x.length !== roleIdsLen) {
      throw new RolesNotAllExistException(roleIds)
    }
    if (res.json.s.length !== 1) {
      throw new SystemAdminNotFoundException()
    }
    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (res.json.v.length !== 0) {
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
      throw new InstitutesOrSubCampusesNotAllInTheUniversityException(instituteIds, subCampusIds, universitiyIds)
    }

    const user = res.json.user[0]

    Object.assign(user, tokenRes)

    return user
  }

  async userAuthenInfos ({ orderBy, first, after, last, before }: RelayPagingConfigArgs) {
    after = atob(after)
    before = atob(before)
    if (orderBy === ORDER_BY.CREATED_AT_DESC && first) {
      return await this.userAuthenInfosRelayForward(first, after)
    }
    throw new Error('Method not implemented.')
  }

  async userAuthenInfosRelayForward (first: number, after: string) {
    const q1 = 'var(func: uid(infos), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid } '
    const query = `
      query v($after: string) {
        infos as var(func: type(UserAuthenInfo), orderdesc: createdAt) @filter(not has(delete))

        ${after ? q1 : ''}
        totalCount(func: uid(infos)) {
          count(uid)
        }
        infos(func: uid(${after ? 'q1' : 'infos'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # ????????????
        startInfo(func: uid(infos), first: -1) {
          createdAt
        }
        # ????????????
        endInfo(func: uid(infos), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startInfo: Array<{createdAt: string}>
      endInfo: Array<{createdAt: string}>
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

  async login (userId: string, id: string, sign: string): Promise<LoginResult> {
    const user = await this.checkUserPasswordAndGetUser(userId, id, sign)
    const payload: Payload = { id: user.id, roles: user.roles }
    return {
      token: this.jwtService.sign(payload),
      ...user
    }
  }

  async checkUserPasswordAndGetUser (userId: string, id: string, sign: string) {
    if (userId && userId.length <= 2) {
      throw new ForbiddenException('userId ????????????3?????????')
    }
    if (!userId && !id) {
      throw new ForbiddenException('userId ??? id ??????????????????')
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
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {user: CheckUserResult[]}>({
      query,
      vars: {
        $userId: userId,
        $sign: sign,
        $id: id
      },
      mutations: [{ mutation, condition }]
    })

    if (res.json.user.length !== 1 || !res.json.user[0].success) {
      throw new ForbiddenException('userId ??? id ???????????????')
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

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      user: UserWithRoles[]
    }>({
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
