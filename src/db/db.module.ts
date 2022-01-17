import { Module } from '@nestjs/common'

import { DbResolver } from './db.resolver'
import { DbService } from './db.service'

@Module({
  providers: [DbResolver, DbService]
})
export class DbModule {}
