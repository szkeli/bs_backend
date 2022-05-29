import { Injectable } from '@nestjs/common'

import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { CreateSubCampusArgs } from './models/subcampus.model'

@Injectable()
export class SubcampusService {
  async university (id: string) {
    throw new Error('Method not implemented.')
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
