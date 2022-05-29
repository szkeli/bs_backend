import { Injectable } from '@nestjs/common'

import { UniversityAlreadyExsistException } from '../app.exception'
import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { Institute } from '../institutes/models/institutes.model'
import { SubCampus } from '../subcampus/models/subcampus.model'
import { handleRelayForwardAfter, now, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { CreateUniversityArgs, University } from './models/universities.models'

@Injectable()
export class UniversitiesService {
  constructor (private readonly dbService: DbService) {}

  async subjects (id: string, args: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
  }

  async users (id: string, args: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
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
                subcampuses as subcampuses @filter(type(Institue))
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
      return await this.instituesRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async instituesRelayForward (id: string, first: number, after: string) {
    const q1 = 'var(func: uid(institues), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($id: string, $after: string) {
            var(func: uid($id)) @filter(type(University)) {
                institues as institues @filter(type(Institue))
            }
            ${after ? q1 : ''}
            totalCount(func: uid(institues)) { count(uid) }
            objs(func: uid(${after ? 'q' : 'institues'}), orderdesc: createdAt, first: ${first}) {
                id: uid
                expand(_all_)
            }
            startO(func: uid(institues), first: -1) { createdAt }
            endO(func: uid(institues), first: 1) { createdAt }
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
