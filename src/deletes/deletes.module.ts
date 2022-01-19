import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { DeletesResolver } from './deletes.resolver'
import { DeletesService } from './deletes.service'

@Module({
  providers: [DeletesResolver, DeletesService, DbService]
})
export class DeletesModule {}
