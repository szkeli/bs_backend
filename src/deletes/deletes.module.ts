import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { DeletesResolver } from './deletes.resolver'
import { DeletesService } from './deletes.service'

@Module({
  providers: [DeletesResolver, DeletesService],
  imports: [SharedModule]
})
export class DeletesModule {}
