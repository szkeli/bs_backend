import { Injectable } from '@nestjs/common'

import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { CreateInstituteArgs } from './models/institutes.model'

@Injectable()
export class InstitutesService {
  async university (id: string) {
    throw new Error('Method not implemented.')
  }

  async createInstitute (args: CreateInstituteArgs) {
    throw new Error('Method not implemented.')
  }

  async institute (id: string) {
    throw new Error('Method not implemented.')
  }

  async institutes (args: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
  }
}
