import { ForbiddenException, Injectable, NotImplementedException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DgraphClient } from 'dgraph-js'

import { DbService } from 'src/db/db.service'

import { SystemErrorException, UserIdExistException, UserNotAuthenException, UserNotFoundException } from '../app.exception'
import { UserAuthenInfo, UserWithRolesAndPrivilegesAndCredential } from '../auth/model/auth.model'
import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { Conversation, ConversationsConnection } from '../conversations/models/conversations.model'
import { ICredential } from '../credentials/models/credentials.model'
import { Deadline } from '../deadlines/models/deadlines.model'
import { Experience } from '../experiences/models/experiences.model'
import { Favorite } from '../favorites/models/favorite.model'
import { Institute } from '../institutes/models/institutes.model'
import { FilterLessonArgs, Lesson } from '../lessons/models/lessons.model'
import { OrderUnion } from '../orders/models/orders.model'
import { Post, PostsConnection } from '../posts/models/post.model'
import { Privilege, PrivilegesConnection } from '../privileges/models/privileges.model'
import { Role } from '../roles/models/roles.model'
import { SubCampus } from '../subcampus/models/subcampus.model'
import { Subject, SubjectsConnection } from '../subject/model/subject.model'
import { atob, btoa, code2Session, edgifyByCreatedAt, handleRelayForwardAfter, NotNull, now, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { University } from '../universities/models/universities.models'
import { Vote, VotesConnectionWithRelay } from '../votes/model/votes.model'
import {
  GENDER,
  PrivateSettings,
  RegisterUserArgs,
  UpdatePrivateSettingsArgs,
  UpdateUserArgs,
  User,
  UsersConnection,
  UsersWithRelayFilter
} from './models/user.model'

@Injectable()
export class UserService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async orders (user: User, args: RelayPagingConfigArgs) {
    const { first, after, orderBy } = args
    const _after = handleRelayForwardAfter(after)
    if (NotNull(first) && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.ordersRelayForward(user, first, _after)
    }
    throw new SystemErrorException()
  }

  async ordersRelayForward (user: User, first: number | null, after: string | null) {
    const q1 = 'var(func: uid(orders), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(User)) { u as uid }
        var(func: has(post)) @filter(type(TakeAwayOrder) or type(IdleItemOrder) or type(TeamUpOrder)) {
          posts as post @filter(type(Post))
        }
        var(func: uid(posts)) @filter(uid_in(creator, uid(u))) {
          orders as ~post
        }
        ${after ? q1 : ''}
        totalCount(func: uid(orders)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'orders'}), orderdesc: createdAt, first: ${first ?? 0}) {
          id: uid
          expand(_all_)
          dgraph.type
        }
        startO(func: uid(orders), first: -1) { createdAt }
        endO(func: uid(orders), first: 1) { createdAt }
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<typeof OrderUnion>>({
      query,
      vars: {
        $id: user.id,
        $after: after
      }
    })

    return relayfyArrayForward({
      ...res,
      first: first ?? 0,
      after
    })
  }

  async conversations (user: User, args: RelayPagingConfigArgs): Promise<ConversationsConnection> {
    const { first, after, orderBy } = args
    if (NotNull(first) && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.conversationsRelayFarword(user, first, after)
    }
    throw new NotImplementedException()
  }

  async conversationsRelayFarword (user: User, first: number | null, after: string | null): Promise<ConversationsConnection> {
    const q1 = 'var(func: uid(conversations), orderdesc: createdAt) @filter(lt(createdAt, #after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(User)) {
          conversations as conversations(orderdesc: createdAt) @filter(type(Conversation))
        }
        ${after ? q1 : ''}
        totalCount(func: uid(conversations)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'conversations'}), orderdesc: createdAt, first: ${first ?? 0}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(conversations), first: -1) { createdAt }
        endO(func: uid(conversations), first: 1) { createdAt }
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Conversation>>({ query, vars: { $id: user.id, $after: after } })
    return relayfyArrayForward({
      ...res,
      first: first ?? 0,
      after
    })
  }

  async favorites (user: User, args: RelayPagingConfigArgs) {
    const { first, after, orderBy } = args
    if (NotNull(first) && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.favoritesRelayFarword(user.id, first, after)
    }
    throw new NotImplementedException()
  }

  async favoritesRelayFarword (id: string, first: number | null, after: string | null) {
    const q1 = 'var(func: uid(favorites), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(User)) {
          favorites as ~creator @filter(type(Favorite))
        }
        ${after ? q1 : ''}
        totalCount(func: uid(favorites)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'favorites'}), orderdesc: createdAt, first: ${first ?? 0}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(favorites), first: -1) { createdAt }
        endO(func: uid(favorites), first: 1) { createdAt }
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Favorite>>({ query, vars: { $id: id, $after: after } })
    return relayfyArrayForward({
      ...res,
      first: first ?? 0,
      after
    })
  }

  async experiencePointTransaction (id: string, { first, after, orderBy }: RelayPagingConfigArgs) {
    if (orderBy === ORDER_BY.CREATED_AT_DESC && first) {
      return await this.experiencePointTransactionsWithRelayForward(id, first, after)
    }
    throw new NotImplementedException()
  }

  async experiencePointTransactionsWithRelayForward (id: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(transactions), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(User)) {
          u as uid
        }
        var(func: type(ExperiencePointTransaction), orderdesc: createdAt) @filter(uid_in(to, uid(u))) {
          transactions as uid
        }
        ${after ? q1 : ''}
        totalCount(func: uid(transactions)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'transactions'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(transactions), first: -1) { createdAt }
        endO(func: uid(transactions), first: 1) { createdAt }
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Experience>>({
      query,
      vars: { $id: id, $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  /**
   * 返回被请求的用户的性别
   * @param currentUser 当前发起请求的用户
   * @param user 被请求的用户
   */
  async gender (currentUser: User, user: User) {
    const query = `
      query v($id: string) {
        user(func: uid($id)) @filter(type(User)) {
          gender
          settings as privateSettings @filter(type(PrivateSettings))
        }
        settings(func: uid(settings)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      settings: PrivateSettings[]
      user: Array<{gender: GENDER}>
    }>({
      query,
      vars: { $id: user?.id }
    })

    if (currentUser?.id !== user?.id && res.settings[0]?.isGenderPrivate) {
      return null
    }

    return res.user[0]?.gender
  }

  /**
   * 更新指定用户的隐私设定
   * @param args 新的 PrivateSettingsPatch
   */
  async updatePrivateSettings (user: User, args: UpdatePrivateSettingsArgs) {
    const query = `
      query v($id: string) {
        u(func: uid($id)) @filter(type(User)) {
          u as uid
          settings as privateSettings @filter(type(PrivateSettings))
        }
        settings(func: uid(settings)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const temp = {
      isSubCampusPrivate: false,
      isGradePrivate: false,
      isUniversityPrivate: false,
      isInstitutePrivate: false,
      isGenderPrivate: false
    }
    Object.assign(temp, args)

    const condition = '@if( eq(len(u), 1) and eq(len(settings), 1) )'
    const mutation = {
      uid: 'uid(settings)',
      ...args
    }

    const createCond = '@if( eq(len(u), 1) and eq(len(settings), 0) )'
    const createMut = {
      uid: 'uid(u)',
      privateSettings: {
        uid: '_:private_settings',
        'dgraph.type': 'PrivateSettings',
        ...temp
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      u: Array<{uid: string}>
      settings: PrivateSettings[]
    }>({
      query,
      mutations: [
        { mutation, condition },
        { mutation: createMut, condition: createCond }
      ],
      vars: { $id: user.id }
    })

    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(user?.id)
    }

    if (res.json.settings.length === 0) {
      return temp
    }

    const _res = res.json.settings[0]
    Object.assign(_res, args)
    return _res
  }

  /**
   * 返回当前用户的 PrivateSettings
   * @param user 某用户
   */
  async privateSettings (user: User) {
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(User)) {
          settings as privateSettings @filter(type(PrivateSettings))
        }
        settings(func: uid(settings)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      settings: PrivateSettings[]
    }>({
      query,
      vars: { $id: user?.id }
    })

    return res.settings[0]
  }

  /**
   * 返回所有用户
   * @param args Relay 分页参数
   * @param filter 按条件返回所有用户
   */
  async usersWithRelay ({ first, after, orderBy }: RelayPagingConfigArgs, filter: UsersWithRelayFilter) {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.usersWithRelayForward(first, after, filter)
    }
    throw new Error('Method not implemented.')
  }

  async usersWithRelayForward (first: number, after: string | null, { universityId }: UsersWithRelayFilter) {
    const q1 = 'var(func: uid(users), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const users = universityId
      ? `
      var(func: uid($universityId)) @filter(type(University)) {
        users as users @filter(type(User))
      }
    `
      : `
      var(func: type(User)) {
        users as uid
      }
      `
    const query = `
      query v($universityId: string, $after: string) {
        ${users}
        ${after ? q1 : ''}
        totalCount(func: uid(users)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'users'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(users), first: -1) { createdAt }
        endO(func: uid(users), first: 1) { createdAt }
      }
    `
    const res = await this.dbService.commitQuery <RelayfyArrayParam<User>>({
      query,
      vars: { $universityId: universityId, $after: after }
    })

    return relayfyArrayForward({
      ...res,
      after,
      first
    })
  }

  /**
   * 返回指定 User 的 subCampuses
   * @param currentUser 发起请求的 User; 对于匿名 User currentUser == null
   * @param id 被获取 subCampuses 的 User
   * @returns {Promise<SubCampus[]>}
   */
  async subCampuses (currentUser: User, id: string): Promise<SubCampus[] | null> {
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(User)) {
          settings as privateSettings @filter(type(PrivateSettings))
          subCampuses as ~users @filter(type(SubCampus))
        }
        settings(func: uid(settings)) {
          id: uid
          expand(_all_)
        }
        subCampuses(func: uid(subCampuses)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      settings: PrivateSettings[]
      subCampuses: SubCampus[]
    }>({
      query,
      vars: { $id: id }
    })

    if (currentUser?.id !== id && res.settings[0]?.isSubCampusPrivate) {
      return null
    }

    return res.subCampuses
  }

  async institutes (currentUser: User, id: string): Promise<Institute[] | null> {
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(User)) {
          settings as privateSettings @filter(type(PrivateSettings))
          institutes as ~users @filter(type(Institute))
        }
        settings(func: uid(settings)) {
          id: uid
          expand(_all_)
        }
        institutes(func: uid(institutes)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      settings: PrivateSettings[]
      institutes: Institute[]
    }>({
      query,
      vars: { $id: id }
    })

    if (res.settings[0]?.isInstitutePrivate && currentUser?.id !== id) {
      return null
    }

    return res.institutes
  }

  async institutesRelayForward (currentUser: User, id: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(institutes)) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(User)) {
          settings as privateSettings @filter(type(PrivateSettings))
          institutes as ~users @filter(type(Institute))
        }
        settings(func: uid(settings)) {
          id: uid
          expand(_all_)
        }
        ${after ? q1 : ''}
        totalCount(func: uid(institutes)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'institutes'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(institutes), first: -1) { createdAt }
        endO(func: uid(institutes), first: 1) { createdAt }
      }
    `
    const res = await this.dbService.commitQuery<{settings: PrivateSettings[]} & RelayfyArrayParam<Institute>>({
      query,
      vars: { $id: id }
    })

    if (res.settings[0]?.isInstitutePrivate && currentUser?.id !== id) {
      return null
    }

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async university (currentUser: User, id: string) {
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(User)) {
          settings as privateSettings @filter(type(PrivateSettings))
          ~users @filter(type(University)) {
            university as uid
          }
        }
        settings(func: uid(settings)) {
          id: uid
          expand(_all_)
        }
        university(func: uid(university)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      university: University[]
      settings: PrivateSettings[]
    }>({
      query,
      vars: { $id: id }
    })

    // 当前用户不是自己时，根据设定判断是否返回 null
    if (currentUser?.id !== id && res.settings[0]?.isUniversityPrivate) {
      return null
    }

    return res.university[0]
  }

  async authenWithin (startTime: string, endTime: string, { after, first, orderBy }: RelayPagingConfigArgs) {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.authenWithinRelayForward(startTime, endTime, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async authenWithinRelayForward (startTime: string, endTime: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(users), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($after: string, $startTime: string, $endTime: string) {
        var(func: between(createdAt, $startTime, $endTime)) @filter(type(User) and not eq(openId, "") and not eq(unionId, "") and has(credential)) {
          users as uid
        }
        ${after ? q1 : ''}
        totalCount(func: uid(users)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'users'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startO(func: uid(users), first: -1) { createdAt }
        # 结束游标
        endO(func: uid(users), first: 1) { createdAt }
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<User>>({ query, vars: { $startTime: startTime, $endTime: endTime, $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async lessons (id: string, { after, first, orderBy }: RelayPagingConfigArgs, filter: FilterLessonArgs) {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.lessonsRelayForward(id, first, after, filter)
    }
    throw new Error('Method not implemented.')
  }

  async lessonsRelayForward (id: string, first: number, after: string | null, { startYear, endYear, semester }: FilterLessonArgs) {
    const q1 = 'var(func: uid(lessons), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($id: string, $after: string) {
          var(func: uid($id)) @filter(type(User)) {
            lessons (orderdesc: createdAt) @filter(type(Lesson) and eq(startYear, ${startYear}) and eq(endYear, ${endYear}) and eq(semester, ${semester}) ) {
              lessons as uid
            }
          }
          ${after ? q1 : ''}
          totalCount(func: uid(lessons)) { count(uid) }
          objs(func: uid(${after ? 'q' : 'lessons'}), orderdesc: createdAt, first: ${first}) {
            id: uid
            expand(_all_)
          }
          # 开始游标
          startO(func: uid(lessons), first: -1) { createdAt }
          # 结束游标
          endO(func: uid(lessons), first: 1) { createdAt } 
        }
      `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Lesson>>({ query, vars: { $id: id, $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async authenInfo (id: string) {
    const query = `
      query v($id: string) {
        v(func: type(UserAuthenInfo)) @filter(uid_in(to, $id) and not has(delete)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{v: UserAuthenInfo[]}>({ query, vars: { $id: id } })
    return res.v[0]
  }

  async deadlines (id: string, { first, after, orderBy }: RelayPagingConfigArgs) {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.deadlinesRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async deadlinesRelayForward (id: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(deadlines), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(User)) {
          deadlines (orderdesc: createdAt) @filter(type(Deadline)) {
            deadlines as uid
          }
        }
        ${after ? q1 : ''}
        totalCount(func: uid(deadlines)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'deadlines'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startO(func: uid(deadlines), first: -1) { createdAt }
        # 结束游标
        endO(func: uid(deadlines), first: 1) { createdAt }
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Deadline>>({ query, vars: { $id: id, $after: after } })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async votesWithRelay (id: string, { first, after, orderBy }: RelayPagingConfigArgs): Promise<VotesConnectionWithRelay> {
    after = btoa(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.votesWithRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async votesWithRelayForward (id, first: number, after: string | null): Promise<VotesConnectionWithRelay> {
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

  async rolesWithRelayForword (id: string, first: number, after: string | null) {
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

  async privilegesWithRelayForward (id: string, first: number, after: string | null): Promise<PrivilegesConnection> {
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
      totalCount: v.totalCount?.[0]?.subjects[0]?.count ?? 0,
      nodes: v?.subjects?.[0]?.subjects ?? []
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
      nodes: v.users ?? [],
      totalCount: v.totalCount?.[0].count ?? 0
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

  /**
   * 获取随机的 userId
   * 通过该方式获取的 userId 有一定概率冲突
   * 应该修改为在一个事务内获取 userId 且完成注册
   * @returns {Promise<string>}
   */
  async getRandomUserId (): Promise<string> {
    let userId: string = ''
    while (1) {
      userId = randomUUID()
      const query = `
        query c($userId: string) {
          v(func: eq(userId, $userId)) @filter(type(User) or type(Admin)) {
            count(uid)
          }
        }
      `
      const res = await this.dbService.commitQuery<{v: Array<{count: number}>}>({ query, vars: { $userId: userId } })

      if ((res.v[0]?.count ?? 0) === 0) {
        break
      }
    }
    return userId
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
      const res = await code2Session(input.code, input.grantType)
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
        u(func: uid($id)) @filter(type(User)) { 
          u as uid
        }
        var(func: eq(userId, $userId)) @filter(not uid(u)) { temp as uid } 
        v(func: uid(temp)) @filter(type(Admin) or type(User)) { v as uid }
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
    const updateCondition = '@if( eq(len(u), 1) and eq(len(c), 1) and eq(len(v), 0) )'
    const updateMutation = {
      uid: 'uid(u)',
      updatedAt: _now
    }

    Object.assign(updateMutation, args)

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
      throw new UserIdExistException(args?.userId ?? '')
    }
    if (res.json.u.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (res.json.c.length !== 1) {
      throw new UserNotAuthenException(id)
    }

    return res.json.user[0]
  }
}
