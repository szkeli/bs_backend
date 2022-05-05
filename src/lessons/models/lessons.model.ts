import { ArgsType, Field, InputType, Int, ObjectType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

@ObjectType()
export class LessonNotificationSettings {
  @Field(of => Boolean, { defaultValue: true, description: '是否订阅通知' })
    needNotifications: boolean

  @Field(of => String, { nullable: true, description: '上次被通知的时间' })
    lastNotifiedAt: string
}

@ArgsType()
export class UpdateLessonNotificationSettingsArgs {
  @Field(of => Boolean, { description: '是否订阅通知' })
    needNotifications: boolean
}

@ObjectType()
export class LessonMetaData {
  @Field(of => Int, { description: '当前开始学年' })
    startYear: number

  @Field(of => Int, { description: '当前结束学年' })
    endYear: number

  @Field(of => Int, { description: '当前学期' })
    semester: number

  @Field(of => Int, { description: '当前周数' })
    week: number
}

@ArgsType()
export class UpdateLessonMetaDataArgs {
  @Field(of => Int, { description: '当前开始学年' })
    startYear: number

  @Field(of => Int, { description: '当前结束学年' })
    endYear: number

  @Field(of => Int, { description: '当前学期' })
    semester: number

  @Field(of => Int, { description: '当前周数' })
    week: number
}

@ObjectType()
export class LessonItem {
  @Field(of => Int, { description: '第几节课开始' })
    start: number

  @Field(of => Int, { description: '第几节课结束' })
    end: number

  @Field(of => Int, { nullable: true, description: '该节课位于一星期中的第几天' })
    dayInWeek: number

  @Field(of => [Int], { nullable: true, description: 'TODO, 该课程要上课的周数的数组' })
    circle: number[]

  @Field({ nullable: true, description: 'TODO, 课程描述，比如 1-17周 星期五 第3-4节 致理楼L1-302,1-17周 星期四 第3-4节 致理楼L1-302' })
    description: string

  @Field({ nullable: true, description: 'TODO, 上课地点' })
    destination: string
}

@InputType()
export class LessonItemInput {
  @Field(of => Int, { description: '第几节课开始' })
    start: number

  @Field(of => Int, { description: '第几节课结束' })
    end: number

  @Field(of => Int, { description: '该节课位于一星期中的第几天' })
    dayInWeek: number

  @Field(of => [Int], { description: '该课程要上课的周数的数组' })
    circle: number[]

  @Field({ description: '课程描述，比如 1-17周 星期五 第3-4节 致理楼L1-302,1-17周 星期四 第3-4节 致理楼L1-302' })
    description: string

  @Field({ description: '上课地点' })
    destination: string
}

@ObjectType({ description: '课程对象' })
export class Lesson {
  @Field({ description: '课程内部唯一 id' })
    id: string

  @Field({ description: '上课地点', nullable: true })
    destination: string

  @Field({ description: '课程名称' })
    name: string

  @Field(of => [Int], { nullable: true, description: 'TODO, 该课程要上课的周数的数组' })
    circle: number[]

  @Field({ description: '课程描述，比如 1-17周 星期五 第3-4节 致理楼L1-302,1-17周 星期四 第3-4节 致理楼L1-302' })
    description: string

  @Field(of => String, { description: '课程的创建时间' })
    createdAt: string

  @Field(of => String, { description: '课程对应的唯一课程号' })
    lessonId: string

  @Field({ nullable: true, description: 'TODO, 授课教师的名字' })
    educatorName: string

  @Field(of => [LessonItem], { nullable: true, description: 'lessonItem' })
    lessonItems?: LessonItem[] | null

  @Field(of => Int, { nullable: true, description: 'TODO, 开始学年' })
    startYear: number

  @Field(of => Int, { nullable: true, description: 'TODO, 结束学年' })
    endYear: number

  @Field(of => Int, { nullable: true, description: 'TODO, 学期' })
    semester: number

  @Field(of => String, { nullable: true, description: '自定义课程时的颜色' })
    color: string
}

@ArgsType()
export class UpdateLessonArgs {
  @Field({ description: '课程id', nullable: true })
    lessonId?: string | null

  @Field({ description: '课程内部id', nullable: true })
    id?: string | null
}

@ArgsType()
export class AddLessonArgs {
  @Field({ description: '上课地点，对于未列出的课程，此项可为 null', nullable: true })
    destination: string

  @Field({ description: '课程名称' })
    name: string

  @Field(of => [Int], { description: '课程的周数的数组，例如[2, 3, 4, 8, 9]' })
    circle: number[]

  @Field({ description: '课程描述，比如 1-17周 星期五 第3-4节 致理楼L1-302,1-17周 星期四 第3-4节 致理楼L1-302' })
    description: string

  @Field({ description: '授课教师的名字' })
    educatorName: string

  @Field({ description: '课程号' })
    lessonId: string

  @Field(of => [LessonItemInput], { description: 'lessonItem，对于未列出的课程，此项可为 null', nullable: true })
    lessonItems?: LessonItemInput[] | null

  @Field(of => Int, { description: '开始学年' })
    startYear: number

  @Field(of => Int, { description: '结束学年' })
    endYear: number

  @Field(of => Int, { description: '学期' })
    semester: number

  @Field(of => String, { nullable: true, description: '自定义课程时的颜色' })
    color: string
}

@ObjectType()
export class LessonsConnection extends Connection<Lesson>(Lesson) {}

export interface FilterLessonsArgs {
  week: number
  dayInWeek: number
  startYear: number
  endYear: number
  semester: number
}

@ArgsType()
export class TriggerLessonNotificationArgs {
  @Field({ description: '被通知的 User 的 id' })
    to: string

  @Field(of => Int, { nullable: true, description: '星期几' })
    dayInWeek: number

  @Field(of => Int, { description: '当前开始学年' })
    startYear: number

  @Field(of => Int, { description: '当前结束学年' })
    endYear: number

  @Field(of => Int, { description: '当前学期' })
    semester: number

  @Field(of => Int, { description: '当前周数' })
    week: number
}

@ArgsType()
export class FilterLessonArgs {
  @Field(of => Int, { description: '当前开始学年' })
    startYear: number

  @Field(of => Int, { description: '当前结束学年' })
    endYear: number

  @Field(of => Int, { description: '当前学期' })
    semester: number
}
