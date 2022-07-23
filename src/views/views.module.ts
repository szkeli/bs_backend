import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { ViewsResolver } from './views.resolver'
import { ViewsService } from './views.service'

@Module({
  imports: [SharedModule],
  providers: [ViewsResolver, ViewsService]
})
export class ViewsModule {}
