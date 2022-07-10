import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver
} from '@nestjs/graphql'

import { CheckPolicies, CurrentUser, NoAuth, Roles } from 'src/auth/decorator'
import { PostsConnection, PostsConnectionWithRelay, RelayPagingConfigArgs } from 'src/posts/models/post.model'
import { PagingConfigArgs, User } from 'src/user/models/user.model'

import { Role } from '../auth/model/auth.model'
import { CreateSubjectPolicyHandler, DeleteSubjectPolicyHandler, MustWithCredentialPolicyHandler } from '../casl/casl.handler'
import { Delete } from '../deletes/models/deletes.model'
import { SubField } from '../subfields/models/subfields.model'
import { UniversitiesConnection } from '../universities/models/universities.models'
import {
  CreateSubjectArgs,
  QuerySubjectsFilter,
  Subject,
  SubjectId,
  SubjectsConnection,
  SubjectsConnectionWithRelay,
  UpdateSubjectArgs
} from './model/subject.model'
import { SubjectService } from './subject.service'

@Resolver((_of: Subject) => Subject)
export class SubjectResolver {
  constructor (private readonly subjectService: SubjectService) {}

  @Query(of => Subject, { description: '以id获取主题' })
  @NoAuth()
  async subject (@Args('id') id: SubjectId) {
    return await this.subjectService.subject(id)
  }

  @Query(of => SubjectsConnection, { description: '获取所有主题', deprecationReason: '请使用 subjectsWithRelay' })
  @NoAuth()
  async subjects (@Args() args: PagingConfigArgs): Promise<SubjectsConnection> {
    return await this.subjectService.subjects(args.first, args.offset)
  }

  @Query(of => SubjectsConnectionWithRelay, { description: '获取所有主题' })
  @NoAuth()
  async subjectsWithRelay (@Args() args: RelayPagingConfigArgs, @Args() filter: QuerySubjectsFilter): Promise<SubjectsConnectionWithRelay> {
    return await this.subjectService.subjectsWithRelay(args, filter)
  }

  @Query(of => PostsConnectionWithRelay, { description: 'Relay版 以id获取某主题下所有帖子', deprecationReason: '请使用 subjects.postsWithRelay' })
  @NoAuth()
  async subjectPostsWithRelay (@Args('id') id: SubjectId, @Args() paging: RelayPagingConfigArgs) {
    return await this.subjectService.postsWithRelay(id, paging)
  }

  @Mutation(of => Delete, { description: '以id删除一个主题' })
  @Roles(Role.Admin, Role.User)
  @CheckPolicies(new MustWithCredentialPolicyHandler(), new DeleteSubjectPolicyHandler())
  async deleteSubject (@CurrentUser() user: User, @Args('id') id: string) {
    return await this.subjectService.deleteSubject(user.id, id)
  }

  @Mutation(of => Subject, { description: '以id更新一个主题' })
  @Roles(Role.Admin, Role.User)
  @CheckPolicies(new MustWithCredentialPolicyHandler())
  async updateSubject (@CurrentUser() user: User, @Args() args: UpdateSubjectArgs) {
    const subjectId = args.id
    delete (args as unknown as any).id
    return await this.subjectService.updateSubject(user.id, subjectId, args)
  }

  @Mutation(of => Subject, { description: '创建一个主题' })
  @CheckPolicies(new MustWithCredentialPolicyHandler(), new CreateSubjectPolicyHandler())
  async createSubject (@CurrentUser() user: User, @Args() args: CreateSubjectArgs): Promise<Subject> {
    return await this.subjectService.createSubject(user.id, args)
  }

  @ResolveField(of => User, { description: '主题的创建者' })
  async creator (@Parent() subject: Subject): Promise<User> {
    return await this.subjectService.getCreatorOfSubject(subject.id)
  }

  @ResolveField(of => PostsConnection, { description: '当前主题中的所有帖子', deprecationReason: '请使用 postsWithRelay' })
  async posts (@Parent() subject: Subject, @Args() args: PagingConfigArgs): Promise<PostsConnection> {
    return await this.subjectService.findPostsBySubjectId(subject.id, args.first, args.offset)
  }

  @ResolveField(of => PostsConnectionWithRelay)
  async postsWithRelay (@Parent() subject: Subject, @Args() paging: RelayPagingConfigArgs) {
    return await this.subjectService.postsWithRelay(subject.id, paging)
  }

  @ResolveField(of => UniversitiesConnection, { description: '具有该 Subject 的所有大学' })
  async universities (@Parent() subject: Subject, @Args() args: RelayPagingConfigArgs) {
    return await this.subjectService.universities(subject.id, args)
  }

  @ResolveField(of => [SubField], { description: 'Subject 的所有 SubField' })
  async subFields (@Parent() subject: Subject) {
    return await this.subjectService.subFields(subject.id)
  }
}
