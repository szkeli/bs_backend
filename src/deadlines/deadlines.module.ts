import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { UserModule } from '../user/user.module'
import { DeadlinesResolver } from './deadlines.resolver'
import { DeadlinesService } from './deadlines.service'
import { UserResolver } from './user.resolver'

@Module({
  providers: [DeadlinesResolver, DeadlinesService, UserResolver],
  imports: [SharedModule, UserModule, DbModule]
})
export class DeadlinesModule {}
