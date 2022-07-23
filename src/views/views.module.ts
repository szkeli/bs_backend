import { Module } from '@nestjs/common'

import { DbModule } from '../db/db.module'
import { SharedModule } from '../shared/shared.module'
import { ViewsResolver } from './views.resolver'
import { ViewsService } from './views.service'

@Module({
  imports: [SharedModule, DbModule],
  providers: [ViewsResolver, ViewsService]
})
export class ViewsModule {}
