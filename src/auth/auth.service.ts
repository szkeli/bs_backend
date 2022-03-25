import { ForbiddenException, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { AuthenticationInfo, CheckUserResult, LoginResult, User } from 'src/user/models/user.model'

import { AdminService } from '../admin/admin.service'
import { SystemAdminNotFoundException, UserHadAuthenedException, UserNotFoundException } from '../app.exception'
import { ORDER_BY } from '../connections/models/connections.model'
import { ICredential } from '../credentials/models/credentials.model'
import { DbService } from '../db/db.service'
import { Delete } from '../deletes/models/deletes.model'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { atob, code2Session, getAuthenticationInfo, getAvatarImageUrlByGender, now, relayfyArrayForward } from '../tool'
import { UserService } from '../user/user.service'
import { Payload, UserAuthenInfo, UserWithRoles } from './model/auth.model'

@Injectable()
export class AuthService {
  constructor (
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly adminService: AdminService,
    private readonly dbService: DbService
  ) {}

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
    const condition1 = '@if( eq(len(x), 0) and eq(len(v), 1) and eq(len(u), 1) and eq(len(q), 1) )'

    // 当前授权者是system
    const condition2 = '@if( eq(len(x), 0) and eq(len(v), 1) and eq(len(u), 1) and eq(len(s), 1) )'
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

    return {
      createdAt: now,
      id: res.uids.get('credential')
    }
  }

  /**
   * 管理员通过认证
   * @param actorId 管理员id
   * @param id 用户id
   * @param info 认证信息
   */
  async authenticateUser (actorId: string, id: string, info: AuthenticationInfo) {
    // 将info附加到用户画像并添加credential信息
    const query = `
      query v($actorId: string, $id: string) {
        # 系统
        s(func: eq(userId, "system")) @filter(type(Admin)) { system as uid }
        # 管理员是否存在
        v(func: uid($actorId)) @filter(type(Admin)) { v as uid }
        # 用户是否存在
        u(func: uid($id)) @filter(type(User)) { u as uid }
        # 用户是否已经认证
        n(func: uid($id)) @filter(type(User)) {
          credential @filter(type(Credential)) {
            n as uid
          }
        }
        # 用户原信息
        user(func: uid(u)) {
          id: uid
          expand(_all_)
        }
        # 用户提交的认证信息
        c(func: type(UserAuthenInfo)) @filter(uid_in(to, $id) and not has(delete)) { c as uid }
      }
    `
    const condition = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(n), 0) )'

    delete info.images
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

    // 如果该用户存在提交的认证信息，标记删除它！
    const deleteTheUserAuthenInfoCondi = '@if( eq(len(system), 1) and eq(len(v), 1) and eq(len(u), 1) and eq(len(n), 0) and eq(len(c), 1) )'
    const addDeleteOnTheUserAuthenInfoMutation = {
      uid: 'uid(c)',
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
          uid: 'uid(c)'
        }
      }
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      n: Array<{uid: string}>
      user: User[]
    }>({
      query,
      mutations: [
        { mutation, condition },
        { mutation: addDeleteOnTheUserAuthenInfoMutation, condition: deleteTheUserAuthenInfoCondi }
      ],
      vars: { $actorId: actorId, $id: id }
    })

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`管理员 ${actorId} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`用户 ${id} 不存在`)
    }
    if (res.json.n.length !== 0) {
      throw new ForbiddenException(`用户 ${id} 已认证`)
    }

    const user = res.json.user[0]
    Object.assign(user, info)

    return user
  }

  async addInfoForAuthenUser (id: string, info: AuthenticationInfo) {
    const query = `
      query v($id: string) {
        v(func: uid($id)) @filter(type(User)) { v as uid }
        u(func: type(UserAuthenInfo)) @filter(uid_in(to, $id) and not has(delete)) {
          u as uid
        }
        user(func: uid(v)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const avatarImageUrl = getAvatarImageUrlByGender(info.gender)
    const condition = '@if( eq(len(v), 1) and eq(len(u), 0) )'
    const mutation = {
      uid: '_:user-authen-info',
      'dgraph.type': 'UserAuthenInfo',
      createdAt: now(),
      ...info,
      avatarImageUrl,
      to: {
        uid: id
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      user: User[]
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: { $id: id }
    })

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`用户 ${id} 不存在`)
    }
    if (res.json.u.length !== 0) {
      throw new ForbiddenException(`用户 ${id} 已提交认证信息`)
    }

    return res.json.user[0]
  }

  /**
   * 用户从可信通道自我认证，比如从校园网提供自己的学生信息
   * @param id 用户id
   * @param token token
   */
  async autoAuthenUserSelf (id: string, token: string) {
    // 测试并解析token
    const tokenRes = getAuthenticationInfo(token)
    const query = `
      query v($id: string) {
        # 系统管理员
        s(func: eq(userId, "system")) @filter(type(Admin)) { system as uid }
        u(func: uid($id)) @filter(type(User)) { u as uid }
        # 用户未通过认证
        v(func: uid($id)) @filter(type(User)) {
          credential @filter(type(Credential)) {
            v as uid
          }
        }
        user(func: uid(u)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const avatarImageUrl = getAvatarImageUrlByGender(tokenRes.gender)
    const condition = '@if( eq(len(u), 1) and eq(len(v), 0) and eq(len(system), 1) )'
    const mutation = {
      uid: id,
      ...tokenRes,
      avatarImageUrl,
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
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      s: Array<{uid: string}>
      u: Array<{uid: string}>
      v: Array<{uid: string}>
      user: User[]
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: { $id: id }
    })

    if (res.json.s.length !== 1) {
      throw new SystemAdminNotFoundException()
    }
    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (res.json.v.length !== 0) {
      throw new UserHadAuthenedException(id)
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
      throw new ForbiddenException('userId 或 id 或密码错误')
    }
    Object.assign(res.json.user[0], {
      lastLoginedAt: now
    })

    return res.json.user[0]
  }

  async loginByCode (code: string) {
    const user = await this.checkUserByCode(code)
    const payload: Payload = { id: user.id, roles: user.roles }
    return {
      token: this.jwtService.sign(payload),
      ...user
    }
  }

  async checkUserByCode (code: string) {
    const { openId, unionId } = await code2Session(code)
    const _now = now()
    const query = `
      query v($openId: string, $unionId: string) {
        user(func: type(User)) @filter(eq(openId, $openId) and eq(unionId, $unionId)) {
          id: v as uid
          expand(_all_)
          roles: dgraph.type
        }
      }
    `
    const condition = '@if( eq(len(v), 1) )'
    const mutation = {
      uid: 'uid(v)',
      lastLoginedAt: _now
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      user: UserWithRoles[]
    }>({
      mutations: [{ mutation, condition }],
      vars: {
        $openId: openId,
        $unionId: unionId
      },
      query
    })

    return res.json.user[0]
  }
}
