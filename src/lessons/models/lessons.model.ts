import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql'

import { Connection } from '../../connections/models/connections.model'

@ObjectType({ description: '课程对象' })
export class Lesson {
  @Field({ description: '课程内部唯一 id' })
    id: string

  @Field({ description: '上课地点' })
    destination: string

  @Field(of => Int, { description: '第几节课开始' })
    start: number

  @Field(of => Int, { description: '第几节课程结束' })
    end: number

  @Field({ description: '课程名称' })
    name: string

  @Field(of => [Int], { description: '该课程要上课的周数的数组' })
    circle: number[]

  @Field({ description: '课程描述，比如 1-17周 星期五 第3-4节 致理楼L1-302,1-17周 星期四 第3-4节 致理楼L1-302' })
    description: string

  @Field(of => [Int], { description: '该节课位于一星期中的第几天' })
    dayOfWeek: number[]

  @Field(of => String, { description: '课程的创建时间' })
    createdAt: string

  @Field(of => String, { description: '课程对应的唯一课程号' })
    lessonId: string

  @Field({ description: '授课教师的名字' })
    educatorName: string
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
  @Field({ description: '该课程添加到对应的用户的id' })
    id: string

  @Field({ description: '上课地点' })
    destination: string

  @Field(type => Int, { description: '第几节课开始' })
    start: number

  @Field(type => Int, { description: '第几节课结束' })
    end: number

  @Field({ description: '课程名称' })
    name: string

  @Field(of => [Int], { description: '课程的周数的数组，例如[2, 3, 4, 8, 9]' })
    circle: number[]

  @Field({ description: '课程描述，比如 1-17周 星期五 第3-4节 致理楼L1-302,1-17周 星期四 第3-4节 致理楼L1-302' })
    description: string

  @Field(type => [Int], { description: '该节课位于一星期中的第几天' })
    dayOfWeek: number[]

  @Field({ description: '授课教师的名字' })
    educatorName: string

  @Field({ description: '课程号' })
    lessonId: string
}

@ObjectType()
export class LessonsConnection extends Connection<Lesson>(Lesson) {}