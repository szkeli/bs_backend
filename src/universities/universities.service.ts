import { Injectable } from '@nestjs/common'

import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { CreateUniversityArgs } from './models/universities.models'

@Injectable()
export class UniversitiesService {
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
