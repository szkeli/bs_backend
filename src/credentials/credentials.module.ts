import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { CredentialsResolver } from './credentials.resolver'
import { CredentialsService } from './credentials.service'

@Module({
  providers: [CredentialsService, CredentialsResolver],
  imports: [DbModule]
})
export class CredentialsModule {}
