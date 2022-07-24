import {
  Args,
  Mutation,
  Query,
  Resolver
} from '@nestjs/graphql'

import { CheckPolicies, CurrentUser, NoAuth, Roles } from 'src/auth/decorator'
import { RelayPagingConfigArgs } from 'src/posts/models/post.model'
import { Person, User } from 'src/user/models/user.model'

import { Role } from '../auth/model/auth.model'
import {
  CreateSubjectPolicyHandler,
  DeleteSubjectPolicyHandler,
  MustWithCredentialPolicyHandler
} from '../casl/casl.handler'
import { Delete } from '../deletes/models/deletes.model'
import {
  CreateSubjectArgs,
  QuerySubjectsFilter,
  Subject,
  SubjectId,
  SubjectsConnectionWithRelay,
  UpdateSubjectArgs
} from './model/subject.model'
import { SubjectService } from './subject.service'

@Resolver(of => Subject)
export class SubjectResolver {
  constructor (private readonly subjectService: SubjectService) {}

  @Query(of => Subject, { description: '以id获取主题' })
  @NoAuth()
  async subject (@Args('id') id: SubjectId) {
    return await this.subjectService.subject(id)
  }

  @Query(of => SubjectsConnectionWithRelay, { description: '获取所有主题' })
  @NoAuth()
  async subjectsWithRelay (
    @Args() args: RelayPagingConfigArgs,
      @Args() filter: QuerySubjectsFilter
  ): Promise<SubjectsConnectionWithRelay> {
    return await this.subjectService.subjectsWithRelay(args, filter)
  }

  @Mutation(of => Delete, { description: '以id删除一个主题' })
  @Roles(Role.Admin, Role.User)
  @CheckPolicies(
    new MustWithCredentialPolicyHandler(),
    new DeleteSubjectPolicyHandler()
  )
  async deleteSubject (@CurrentUser() user: User, @Args('id') id: string) {
    return await this.subjectService.deleteSubject(user.id, id)
  }

  @Mutation(of => Subject, { description: '以id更新一个主题' })
  @Roles(Role.Admin, Role.User)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async updateSubject (
  @CurrentUser() user: User,
    @Args() args: UpdateSubjectArgs
  ) {
    const subjectId = args.id
    delete (args as unknown as any).id
    return await this.subjectService.updateSubject(user.id, subjectId, args)
  }

  @Mutation(of => Subject, { description: '创建一个主题' })
  @Roles(Role.Admin, Role.User)
  @CheckPolicies(
    new MustWithCredentialPolicyHandler(),
    new CreateSubjectPolicyHandler()
  )
  async createSubject (
    @CurrentUser() person: Person,
      @Args() args: CreateSubjectArgs
  ): Promise<Subject> {
    return await this.subjectService.createSubject(person.id, args)
  }
}
