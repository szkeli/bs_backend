import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { InstitutesResolver } from './institutes.resolver'
import { InstitutesService } from './institutes.service'

@Module({
  providers: [InstitutesResolver, InstitutesService, DbService]
})
export class InstitutesModule {}
