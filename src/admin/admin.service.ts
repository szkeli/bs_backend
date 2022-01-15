import { Injectable } from '@nestjs/common'

import { CreateAdminInput } from './models/admin.model'

@Injectable()
export class AdminService {
  async createAdmin (input: CreateAdminInput) {
    throw new Error('Method not implemented.')
  }
}
