import { Injectable } from '@nestjs/common'

import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { CreateUniversityArgs } from './models/universities.models'

@Injectable()
export class UniversitiesService {
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

  async createUniversity (args: CreateUniversityArgs) {
    throw new Error('Method not implemented.')
  }

  async university (id: string) {
    throw new Error('Method not implemented.')
  }

  async universities (args: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
  }
}
