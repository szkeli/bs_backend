import { Module } from '@nestjs/common'

import { SharedModule } from '../shared/shared.module'
import { UserModule } from '../user/user.module'
import { CreatableResolver } from './creatable.resolver'
import { PersonResolver } from './person.resolver'
import { PersonService } from './person.service'
import { PrivilegeResolver } from './privilege.resolver'
import { SubjectResolver } from './subject.resolver'

@Module({
  imports: [SharedModule, UserModule],
  providers: [
    PersonResolver,
    PersonService,
    SubjectResolver,
    PrivilegeResolver,
    CreatableResolver
  ]
})
export class PersonModule {}
