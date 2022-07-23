import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { UniversitiesResolver } from './universities.resolver'
import { UniversitiesService } from './universities.service'

@Module({
  imports: [SharedModule],
  providers: [UniversitiesResolver, UniversitiesService]
})
export class UniversitiesModule {}
