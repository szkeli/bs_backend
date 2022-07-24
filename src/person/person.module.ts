import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { PersonResolver } from './person.resolver'
import { PersonService } from './person.service'
import { PrivilegeResolver } from './privilege.resolver'
import { SubjectResolver } from './subject.resolver'

@Module({
  imports: [SharedModule],
  providers: [PersonResolver, PersonService, SubjectResolver, PrivilegeResolver]
})
export class PersonModule {}
