import { Module } from '@nestjs/common'

import { DbService } from '../db/db.service'
import { ViewsResolver } from './views.resolver'
import { ViewsService } from './views.service'

@Module({
  providers: [ViewsResolver, ViewsService, DbService]
})
export class ViewsModule {}
