import { Injectable } from '@nestjs/common'

import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { University } from '../universities/models/universities.models'
import { CreateSubCampusArgs } from './models/subcampus.model'

@Injectable()
export class SubcampusService {
  constructor (private readonly dbService: DbService) {}

  async university (id: string) {
    const query = `
        query v($id: string) {
            var(func: uid($id)) @filter(type(SubCampus)) {
                university as ~subcampus @filter(type(University))
            }
            university(func: uid(university)) {
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

  async createSubCampus (args: CreateSubCampusArgs) {
    throw new Error('Method not implemented.')
  }

  async subcampuses (args: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
  }

  async subcampus (id: string) {
    throw new Error('Method not implemented.')
  }
}
