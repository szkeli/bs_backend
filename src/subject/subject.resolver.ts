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
import { PagingConfigArgs, User } from 'src/user/models/user.model'

import {
  CreateSubjectInput,
  Subject,
  SubjectId,
  SubjectsConnection
} from './model/subject.model'
import { SubjectService } from './subject.service'

@Resolver((_of: Subject) => Subject)
export class SubjectResolver {
  constructor (private readonly subjectService: SubjectService) {}

  @Query(of => Subject, { description: '以id获取主题' })
  async subject (@Args('id') id: SubjectId) {
    return await this.subjectService.subject(id)
  }

  @Query(of => SubjectsConnection, { description: '获取所有主题' })
  async subjects (@Args() args: PagingConfigArgs): Promise<SubjectsConnection> {
    return await this.subjectService.subjects(args.first, args.offset)
  }

  @Mutation(of => Subject, { description: '创建一个主题' })
  async createSubject (@CurrentUser() user: User, @Args('input') input: CreateSubjectInput
  ): Promise<Subject> {
    return await this.subjectService.createASubject(user.id, input)
  }

  @ResolveField(of => User, { description: '主题的创建者' })
  async creator (@Parent() subject: Subject): Promise<User> {
    return await this.subjectService.getCreatorOfSubject(subject.id)
  }

  @ResolveField(of => PostsConnection, { description: '当前主题中的所有帖子' })
  async posts (@Parent() subject: Subject, @Args() args: PagingConfigArgs): Promise<PostsConnection> {
    return await this.subjectService.findPostsBySubjectId(subject.id, args.first, args.offset)
  }
}
