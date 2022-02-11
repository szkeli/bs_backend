import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { AnonymousResolver } from './anonymous.resolver'
import { AnonymousService } from './anonymous.service'

@Module({
  providers: [AnonymousResolver, AnonymousService, DbService]
})
export class AnonymousModule {}
