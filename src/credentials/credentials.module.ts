import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { CredentialsResolver } from './credentials.resolver'
import { CredentialsService } from './credentials.service'

@Module({
  providers: [CredentialsService, CredentialsResolver, DbService]
})
export class CredentialsModule {}
