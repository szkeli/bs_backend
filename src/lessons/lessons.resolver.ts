import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { Admin } from '../admin/models/admin.model'
import { CurrentAdmin, CurrentPerson, CurrentUser, Role, Roles } from '../auth/decorator'
import { DeadlinesConnection } from '../deadlines/models/deadlines.model'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import { PersonWithRoles, User } from '../user/models/user.model'
import { LessonsService } from './lessons.service'
import { AddLessonArgs, Lesson, LessonMetaData, LessonNotificationSettings, LessonsConnection, TriggerLessonNotificationArgs, UpdateLessonArgs, UpdateLessonMetaDataArgs, UpdateLessonNotificationSettingsArgs } from './models/lessons.model'

@Resolver(of => Lesson)
export class LessonsResolver {
  constructor (
    private readonly lessonsService: LessonsService
  ) {}

  @Query(of => LessonNotificationSettings, { description: '获取当前用户上课通知的设置' })
  @Roles(Role.User)
  async lessonNotificationSettings (@CurrentUser() user: User) {
    return await this.lessonsService.lessonNotificationSettings(user.id)
  }

  @Mutation(of => LessonNotificationSettings, { description: '更新用户上课通知设置' })
  @Roles(Role.User)
  async updateLessonNotificationSettings (@CurrentUser() user: User, @Args() args: UpdateLessonNotificationSettingsArgs) {
    return await this.lessonsService.updateLessonNotificationSettings(user.id, args)
  }

  @Mutation(of => Lesson, { description: '添加一个课程到当前用户' })
  @Roles(Role.Admin, Role.User)
  async addLesson (@CurrentPerson() person: PersonWithRoles, @Args() args: AddLessonArgs) {
    if (person.roles?.includes(Role.Admin) && person.id !== args.id) {
      // 管理员添加课程到指定用户
      return await this.lessonsService.addLesson(person.id, args)
    }
    if (person.roles?.includes(Role.User)) {
      // 用户给自己添加课程
      return await this.lessonsService.addLessonSelf(person.id, args)
    }
  }

  @Mutation(of => LessonMetaData, { description: '更新课程表元信息' })
  @Roles(Role.Admin)
  async updateLessonMetaData (@Args() args: UpdateLessonMetaDataArgs) {
    return await this.lessonsService.updateLessonMetaData(args)
  }

  @Query(of => LessonMetaData, { description: '获取最新的课程表元信息' })
  @Roles(Role.Admin)
  async lessonMetaData () {
    return await this.lessonsService.lessonMetaData()
  }

  @Mutation(of => Lesson, { description: '管理员更新一个课程' })
  @Roles(Role.Admin)
  async updateLesson (@CurrentAdmin() admin: Admin, @Args() args: UpdateLessonArgs) {
    return await this.lessonsService.updateLesson(admin.id, args)
  }

  @Query(of => LessonsConnection, { description: '获取所有的课程' })
  @Roles(Role.Admin, Role.User)
  async lessons (@Args() args: RelayPagingConfigArgs) {
    return await this.lessonsService.lessons(args)
  }

  @Query(of => Lesson, { description: '以 id 获取指定课程' })
  async lesson (@Args('id') id: string) {
    return await this.lessonsService.lesson(id)
  }

  @ResolveField(of => DeadlinesConnection, { description: '获取该课程的所有 deadline' })
  async deadlines (@Parent() lesson: Lesson, @Args() args: RelayPagingConfigArgs) {
    return await this.lessonsService.deadlines(lesson.id, args)
  }

  @Mutation(of => String, { description: '测试接口，手动触发一个上课课程通知' })
  @Roles(Role.Admin)
  // TODO 统一测试方法
  async triggerLessonNotification (@Args() args: TriggerLessonNotificationArgs) {
    return (await this.lessonsService.triggerLessonNotification(args)).errmsg
  }
}
