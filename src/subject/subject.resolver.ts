import { UseGuards } from '@nestjs/common'
import {
  Args,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver
} from '@nestjs/graphql'

import { CurrentUser } from 'src/auth/decorator'
import { GqlAuthGuard } from 'src/auth/gql.strategy'
import { PostsConnection } from 'src/posts/models/post.model'
import { FollowersConnection, User } from 'src/user/models/user.model'

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
  async subjects (
    @Args('first', { nullable: true, type: () => Int, defaultValue: 0 }) first: number,
      @Args('offset', { nullable: true, type: () => Int, defaultValue: 0 }) offset: number
  ): Promise<SubjectsConnection> {
    return await this.subjectService.subjects(first, offset)
  }

  @Mutation(returns => Subject)
  @UseGuards(GqlAuthGuard)
  async createSubject (
    @CurrentUser() user: User,
      @Args('input') input: CreateSubjectInput
  ): Promise<Subject> {
    return await this.subjectService.createASubject(user.id, input)
  }

  @Mutation(returns => Subject)
  @UseGuards(GqlAuthGuard)
  async updateSubject (
  @CurrentUser() user: User,
    @Args('input') input: UpdateSubjectInput
  ) {
    return await this.subjectService.updateSubject(input)
  }

  @ResolveField(returns => User)
  async creator (@Parent() subject: Subject): Promise<User> {
    return await this.subjectService.getCreatorOfSubject(subject.id)
  }

  @ResolveField(returns => FollowersConnection)
  async followers (
  @Parent() subject: Subject,
    @Args('after') after: String,
    @Args('before') before: String,
    @Args('first') first: Number,
    @Args('last') last: Number
  ) {
    throw new Error('undefined')
    // return await this.userService.findFansByUserId(
    //   user.userId,
    //   input
    // )
  }

  @ResolveField(returns => PostsConnection)
  async posts (
    @Parent() subject: Subject,
      @Args('first', { nullable: true, type: () => Int, defaultValue: 2 }) first: number,
      @Args('offset', { nullable: true, type: () => Int, defaultValue: 0 }) offset: number
  ): Promise<PostsConnection> {
    return await this.subjectService.findPostsBySubjectId(subject.id, first, offset)
  }
}
