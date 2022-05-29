import { Injectable } from '@nestjs/common'

import { UniversityAlreadyExsistException } from '../app.exception'
import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { Institute } from '../institutes/models/institutes.model'
import { SubCampus } from '../subcampus/models/subcampus.model'
import { Subject } from '../subject/model/subject.model'
import { handleRelayForwardAfter, now, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { User } from '../user/models/user.model'
import { CreateUniversityArgs, University } from './models/universities.models'

@Injectable()
export class UniversitiesService {
  constructor (private readonly dbService: DbService) {}

  async subjects (id: string, { after, first, orderBy }: RelayPagingConfigArgs) {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.subjectsRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async subjectsRelayForward (id: string, first: number, after: string) {
    const q1 = 'var(func: uid(subjects), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($id: string, $after: string) {
            var(func: uid($id)) @filter(type(University)) {
                subjects as subjects @filter(type(Subject))
            }
            ${after ? q1 : ''}
            totalCount(func: uid(subjects)) { count(uid) }
            objs(func: uid(${after ? 'q' : 'users'}), orderdesc: createdAt, first: ${first}) {
                id: uid
                expand(_all_)
            }
            startO(func: uid(subjects), first: -1) { createdAt }
            endO(func: uid(subjects), first: 1) { createdAt }
        }
    `
    const res = await this.dbService.commitQuery <RelayfyArrayParam<Subject>>({
      query,
      vars: { $id: id, $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async users (id: string, { after, first, orderBy }: RelayPagingConfigArgs) {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.usersRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async usersRelayForward (id: string, first: number, after: string) {
    const q1 = 'var(func: uid(users), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($id: string, $after: string) {
            var(func: uid($id)) @filter(type(University)) {
                users as users @filter(type(User))
            }
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
      vars: { $id: id, $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async subcampuses (id: string, { after, first, orderBy }: RelayPagingConfigArgs) {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.subcampusesRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async subcampusesRelayForward (id: string, first: number, after: string) {
    const q1 = 'var(func: uid(subcampuses), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($id: string, $after: string) {
            var(func: uid($id)) @filter(type(University)) {
                subcampuses as subcampuses @filter(type(SubCampus))
            }
            ${after ? q1 : ''}
            totalCount(func: uid(subcampuses)) { count(uid) }
            objs(func: uid(${after ? 'q' : 'subcampuses'}), orderdesc: createdAt, first: ${first}) {
                id: uid
                expand(_all_)
            }
            startO(func: uid(subcampuses), first: -1) { createdAt }
            endO(func: uid(subcampuses), first: 1) { createdAt }
        }
    `
    const res = await this.dbService.commitQuery <RelayfyArrayParam<SubCampus>>({
      query,
      vars: { $id: id, $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async institutes (id: string, { first, after, orderBy }: RelayPagingConfigArgs) {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.institutesRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async institutesRelayForward (id: string, first: number, after: string) {
    const q1 = 'var(func: uid(institutes), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($id: string, $after: string) {
            var(func: uid($id)) @filter(type(University)) {
                institutes as institutes @filter(type(Institute))
            }
            ${after ? q1 : ''}
            totalCount(func: uid(institues)) { count(uid) }
            objs(func: uid(${after ? 'q' : 'institutes'}), orderdesc: createdAt, first: ${first}) {
                id: uid
                expand(_all_)
            }
            startO(func: uid(institutes), first: -1) { createdAt }
            endO(func: uid(institutes), first: 1) { createdAt }
        }
    `
    const res = await this.dbService.commitQuery <RelayfyArrayParam<Institute>>({
      query,
      vars: { $id: id, $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async createUniversity ({ name, logoUrl }: CreateUniversityArgs) {
    const query = `
        query v($name: string) {
            university(func: eq(name, $name)) @filter(type(University)) {
                u as uid
            }
        }
      `
    const condition = '@if( eq(len(u), 0) )'
    const mutation = {
      uid: '_:university',
      name,
      logoUrl,
      createdAt: now()
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      university: University[]
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: { $name: name }
    })

    if (res.json.university.length !== 0) {
      throw new UniversityAlreadyExsistException(name)
    }

    return {
      id: res.uids.get('_:university'),
      name,
      logoUrl
    }
  }

  async university (id: string) {
    const query = `
        query v($id: string) {
            university(func: uid($id)) @filter(type(University)) {
                id: uid
                expand(_all_)
            }
        }
      `
    const res = await this.dbService.commitQuery<{
      university: University[]
    }>({
      query,
      vars: { $id: id }
    })

    return res.university[0]
  }

  async universities ({ after, orderBy, first }: RelayPagingConfigArgs) {
    after = handleRelayForwardAfter(after)
    if (after && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.universitiesRelayForward(after, first)
    }
    throw new Error('Method not implemented.')
  }

  async universitiesRelayForward (after: string, first: number) {
    const q1 = 'var(func: uid(universities), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($after: string) {
            var(func: type(University)) {
                universities as uid
            }
            ${after ? q1 : ''}
            totalCount(func: uid(universities)) { count(uid) }
            objs(func: uid(${after ? 'q' : 'universities'}), orderdesc: createdAt, first: ${first}) {
                id: uid
                expand(_all_)
            }
            # 开始游标
            startO(func: uid(universities), first: -1) { createdAt }
            # 结束游标
            endO(func: uid(universities), first: 1) { createdAt }
        } 
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<University>>({
      query, vars: { $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }
}
