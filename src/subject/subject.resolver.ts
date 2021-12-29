import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from 'src/auth/decorator';
import { GqlAuthGuard } from 'src/auth/gql.strategy';
import { User } from 'src/user/models/user.model';
import { CreateSubjectInput, Subject, SubjectId, UpdateSubjectInput } from './model/subject.model';
import { SubjectService } from './subject.service';

@Resolver()
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
}
