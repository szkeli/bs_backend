import { Injectable } from '@nestjs/common'

import { UniversityAlreadyExsistException } from '../app.exception'
import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { now } from '../tool'
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

  async subcampuses (id: string, args: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
  }

  async institutes (id: string, args: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
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
    throw new Error('Method not implemented.')
  }

  async universities (args: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
  }
}
