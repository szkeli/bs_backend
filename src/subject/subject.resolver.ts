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

  @Query(returns => Subject, { description: '根据主题id返回对应的主题' })
  async subject (@Args('id') id: SubjectId) {
    return await this.subjectService.subject(id)
  }

  @Query(returns => SubjectsConnection, { description: '分页返回主题' })
  async subjects (@Args() args: PagingConfigArgs): Promise<SubjectsConnection> {
    return await this.subjectService.subjects(args.first, args.offset)
  }

  @Mutation(returns => Subject, { description: '创建一个主题' })
  async createSubject (@CurrentUser() user: User, @Args('input') input: CreateSubjectInput
  ): Promise<Subject> {
    return await this.subjectService.createASubject(user.id, input)
  }

  @ResolveField(returns => User, { description: '主题的创建者' })
  async creator (@Parent() subject: Subject): Promise<User> {
    return await this.subjectService.getCreatorOfSubject(subject.id)
  }

  @ResolveField(returns => PostsConnection, { description: '分页返回主题中的帖子' })
  async posts (@Parent() subject: Subject, @Args() args: PagingConfigArgs): Promise<PostsConnection> {
    return await this.subjectService.findPostsBySubjectId(subject.id, args.first, args.offset)
  }
}
