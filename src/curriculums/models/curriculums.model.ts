import { ArgsType, Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class Curriculum {
  @Field()
    id: string

  @Field({ description: '上课地点' })
    destination: string

  @Field(type => Int, { description: '第几节课开始' })
    start: number

  @Field(type => Int, { description: '第几节课结束' })
    end: number

  @Field({ description: '课程名称' })
    name: string

  @Field({ description: '课程周期，比如 1-17周' })
    circle: string

  @Field({ description: '课程描述，比如 1-17周 星期五 第3-4节 致理楼L1-302,1-17周 星期四 第3-4节 致理楼L1-302' })
    description: string

  @Field(type => Int, { description: '该节课位于一星期中的第几天' })
    dayOfWeek: number
}

@ArgsType()
export class AddCurriculumArgs {
  @Field({ description: '上课地点' })
    destination: string

  @Field(type => Int, { description: '第几节课开始' })
    start: number

  @Field(type => Int, { description: '第几节课结束' })
    end: number

  @Field({ description: '课程名称' })
    name: string

  @Field({ description: '课程周期，比如 1-17周' })
    circle: string

  @Field({ description: '课程描述，比如 1-17周 星期五 第3-4节 致理楼L1-302,1-17周 星期四 第3-4节 致理楼L1-302' })
    description: string

  @Field(type => Int, { description: '该节课位于一星期中的第几天' })
    dayOfWeek: number

  @Field({ description: '授课教师的名字' })
    educatorName: string

  @Field({ description: '课程号' })
    curriculumId: string
}

@ObjectType()
export class CurriculumsConnection {
  @Field(type => [Curriculum])
    nodes: Curriculum[]

  @Field(type => Int)
    totalCount: number
}
