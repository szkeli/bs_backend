import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { AdminResolver } from './admin.resolver'
import { CredentialsResolver } from './credentials.resolver'
import { CredentialsService } from './credentials.service'
import { UserResolver } from './user.resolver'

@Module({
  providers: [CredentialsService, CredentialsResolver, UserResolver, AdminResolver],
  imports: [DbModule]
})
export class CredentialsModule {}
