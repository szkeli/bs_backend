import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { CurrentUser } from 'src/auth/decorator';
import { GqlAuthGuard } from 'src/auth/gql.strategy';
import { PagingConfigInput } from 'src/comment/models/comment.model';
import { Post } from 'src/posts/models/post.model';
import { User } from 'src/user/models/user.model';
import { CreateSubjectInput, Subject, SubjectId, UpdateSubjectInput } from './model/subject.model';
import { SubjectService } from './subject.service';

@Resolver((_of: Subject) => Subject)
export class SubjectResolver {
  constructor(private readonly subjectService: SubjectService) {}

  @Query(returns => Subject) 
  async subject(@Args('id') id: SubjectId) {
    return await this.subjectService.subject(id);
  }

  @Mutation(returns => Subject)
  @UseGuards(GqlAuthGuard)
  async addSubject(
    @CurrentUser() user: User,
    @Args('input') input: CreateSubjectInput,
  ) {
    return await this.subjectService.addSubject(user.userId, input);
  }

  @Mutation(returns => Subject)
  @UseGuards(GqlAuthGuard)
  async updateSubject(
    @CurrentUser() user: User,
    @Args('input') input: UpdateSubjectInput,
  ) {
    return await this.subjectService.updateSubject(input);
  }

  @ResolveField(returns => User)
  async creator(@Parent() subject: Subject) {
    return await this.subjectService.getCreatorOfSubject(subject.id);
  }

  @ResolveField(returns => [User])
  async users(
    @Parent() subject: Subject,
    @Args('input') input: PagingConfigInput,
  ) {
    return await this.subjectService.getUsersBySubjectId(subject.id, input);
  }

  @ResolveField(returns => [Post])
  async posts(
    @Parent() subject: Subject,
    @Args('input') input: PagingConfigInput,
  ) {
    return await this.subjectService.getPostsBySubjectId(subject.id, input);
  }
}
