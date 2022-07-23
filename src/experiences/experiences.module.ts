import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { ExperiencesResolver } from './experiences.resolver'
import { ExperiencesService } from './experiences.service'

@Module({
  providers: [ExperiencesService, ExperiencesResolver],
  imports: [SharedModule]
})
export class ExperiencesModule {}
