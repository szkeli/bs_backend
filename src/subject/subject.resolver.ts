import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver
} from '@nestjs/graphql'

import { CurrentUser } from 'src/auth/decorator'
import { PostsConnection } from 'src/posts/models/post.model'
import { FollowersConnection, PagingConfigArgs, User } from 'src/user/models/user.model'

import {
  CreateSubjectInput,
  Subject,
  SubjectId,
  SubjectsConnection,
  UpdateSubjectInput
} from './model/subject.model'
import { SubjectService } from './subject.service'

@Resolver((_of: Subject) => Subject)
export class SubjectResolver {
  constructor (private readonly subjectService: SubjectService) {}

  @Query(returns => Subject)
  async subject (@Args('id') id: SubjectId) {
    return await this.subjectService.subject(id)
  }

  @Query(returns => SubjectsConnection)
  async subjects (@Args() args: PagingConfigArgs): Promise<SubjectsConnection> {
    return await this.subjectService.subjects(args.first, args.offset)
  }

  @Mutation(returns => Subject)
  async createSubject (@CurrentUser() user: User, @Args('input') input: CreateSubjectInput
  ): Promise<Subject> {
    return await this.subjectService.createASubject(user.id, input)
  }

  @Mutation(returns => Subject)
  async updateSubject (@CurrentUser() user: User, @Args('input') input: UpdateSubjectInput
  ) {
    return await this.subjectService.updateSubject(input)
  }

  @ResolveField(returns => User)
  async creator (@Parent() subject: Subject): Promise<User> {
    return await this.subjectService.getCreatorOfSubject(subject.id)
  }

  @ResolveField(returns => FollowersConnection)
  async followers (@Parent() subject: Subject, @Args() args: PagingConfigArgs) {
    throw new Error('undefined')
  }

  @ResolveField(returns => PostsConnection)
  async posts (@Parent() subject: Subject, @Args() args: PagingConfigArgs): Promise<PostsConnection> {
    return await this.subjectService.findPostsBySubjectId(subject.id, args.first, args.offset)
  }
}
