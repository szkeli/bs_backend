import { forwardRef, Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { DeletesResolver } from './deletes.resolver'
import { DeletesService } from './deletes.service'

@Module({
  providers: [DeletesResolver, DeletesService],
  imports: [forwardRef(() => SharedModule), DbModule],
  exports: [DeletesService]
})
export class DeletesModule {}
