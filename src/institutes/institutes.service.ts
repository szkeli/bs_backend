import { Injectable } from '@nestjs/common'

import { InstituteAlreadyAtTheUniversityException, InstituteNotFoundException, SystemErrorException, UniversityHasBeenDeletedException, UniversityNotFoundException } from '../app.exception'
import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { now, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { University } from '../universities/models/universities.models'
import { CreateInstituteArgs, DeleteInstituteArgs, Institute } from './models/institutes.model'

@Injectable()
export class InstitutesService {
  constructor (private readonly dbService: DbService) {}

  async deleteInstitute ({ id }: DeleteInstituteArgs) {
    const query = `
      query v($id: string) {
        s(func: uid($id)) @filter(type(Institute)) { 
          s as uid
          ~institutes @filter(type(University)) {
            u as uid
          }
        }
      }
    `
    const condition = '@if( eq(len(s), 1) )'
    const mutation = {
      uid: 'uid(u)',
      institutes: {
        uid: 'uid(s)',
        'dgraph.type': 'Institute'
      }
    }

    const res = await this.dbService.commitConditionalDeletions<Map<string, string>, {
      s: Array<{uid: string}>
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: { $id: id }
    })

    if (res.json.s.length !== 1) {
      throw new InstituteNotFoundException(id)
    }

    return true
  }

  async university (id: string) {
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(Institute)) {
          i as ~institutes @filter(type(University))
        }
        i(func: uid(i)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{i: University[]}>({
      query, vars: { $id: id }
    })

    return res.i[0]
  }

  async createInstitute ({ id, ...args }: CreateInstituteArgs): Promise<Institute> {
    const query = `
      query v($id: string, $name: string) {
        u(func: uid($id)) @filter(type(University)) {
          u as uid
          institutes @filter(eq(name, $name) and type(Institute)) {
            i as uid
          }
        }
        i(func: uid(i)) { uid }
        # 被添加 Institute 的大学是否已被删除
        j(func: uid(u)) @filter(not has(delete)) {
          j as uid
        }
      }
    `
    const condition = '@if( eq(len(u), 1) and eq(len(i), 0) and eq(len(j), 1) )'
    const mutation = {
      uid: 'uid(u)',
      institutes: {
        uid: '_:institute',
        'dgraph.type': 'Institute',
        ...args,
        createdAt: now()
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      u: Array<{uid: string}>
      i: Array<{uid: string}>
      j: Array<{uid: string}>
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: { $id: id, $name: args.name }
    })

    if (res.json.u.length !== 1) {
      throw new UniversityNotFoundException(id)
    }
    if (res.json.i.length !== 0) {
      throw new InstituteAlreadyAtTheUniversityException(id, args.name)
    }
    if (res.json.j.length !== 1) {
      throw new UniversityHasBeenDeletedException(id)
    }

    const _id = res.uids.get('institute')
    if (!_id) throw new SystemErrorException()

    return {
      id: _id,
      ...args,
      createdAt: now()
    }
  }

  async institute (id: string) {
    const query = `
      query v($id: string) {
        i(func: uid($id)) @filter(type(Institute)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{i: Institute[]}>({
      query, vars: { $id: id }
    })

    return res.i[0]
  }

  async institutes ({ first, after, orderBy }: RelayPagingConfigArgs) {
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.institutesRelayForward(after, first)
    }
    throw new Error('Method not implemented.')
  }

  async institutesRelayForward (after: string | null, first: number) {
    const q1 = 'var(func: uid(institutes), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($after: string) {
        var(func: type(Institute)) {
          institutes as uid
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

    const res = await this.dbService.commitQuery<RelayfyArrayParam<Institute>>({
      query,
      vars: { $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }
}
