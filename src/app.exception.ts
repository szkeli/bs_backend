import { HttpException, HttpStatus } from '@nestjs/common'

import { IPRIVILEGE } from './privileges/models/privileges.model'

export class UserIdExistException extends HttpException {
  constructor (id: string) {
    super(`userId ${id} 已被使用`, HttpStatus.FORBIDDEN)
  }
}
export class UserNotFoundException extends HttpException {
  constructor (id: string) {
    super(`用户 ${id} 不存在`, HttpStatus.FORBIDDEN)
  }
}

export class UserHadSubmitAuthenInfoException extends HttpException {
  constructor (id: string) {
    super(`用户 ${id} 已提交认证信息`, HttpStatus.FORBIDDEN)
  }
}

export class RolesNotAllExistException extends HttpException {
  constructor (ids: string[]) {
    super(`请求数据 ${ids.toString()} 存在未定义的角色的 id`, HttpStatus.FORBIDDEN)
  }
}

export class RoleNotFoundException extends HttpException {
  constructor (id: string) {
    super(`角色 ${id} 不存在`, HttpStatus.FORBIDDEN)
  }
}

export class UserAlreadyHasTheRoleException extends HttpException {
  constructor (id: string, roleId: string) {
    super(`用户 ${id} 已经拥有 ${roleId} 角色`, HttpStatus.FORBIDDEN)
  }
}

export class UserNotAuthenException extends HttpException {
  constructor (id: string) {
    super(`用户 ${id} 未认证`, HttpStatus.FORBIDDEN)
  }
}

export class UserHadAuthenedException extends HttpException {
  constructor (id: string) {
    super(`用户 ${id} 已认证`, HttpStatus.FORBIDDEN)
  }
}

export class AdminNotFoundException extends HttpException {
  constructor (id: string) {
    super(`管理员 ${id} 不存在`, HttpStatus.FORBIDDEN)
  }
}

export class SystemAdminNotFoundException extends HttpException {
  constructor () {
    super('请先创建userId为system的管理员作为系统', HttpStatus.FORBIDDEN)
  }
}

export class LackSomeOfPrivilegeException extends HttpException {
  constructor (i: IPRIVILEGE) {
    super(`缺少 ${i} 权限`, HttpStatus.FORBIDDEN)
  }
}

export class MustWithCredentialException extends HttpException {
  constructor () {
    super('必须先认证', HttpStatus.FORBIDDEN)
  }
}

/**
 * @deprecated use `UserAlreadyHasTheLesson` instead
 */
export class UserAlreadyHasTheCurriculum extends HttpException {
  constructor (id: string) {
    super('用户 id 早已添加该课程', HttpStatus.FORBIDDEN)
  }
}

export class UserAlreadyHasTheLesson extends HttpException {
  constructor (id: string) {
    super('用户 id 早已添加该课程', HttpStatus.FORBIDDEN)
  }
}

/**
 * @deprecated use `UserNotHasTheLesson` instead
 */
export class UserNotHasTheCurriculum extends HttpException {
  constructor (id: string, curriculumId: string) {
    super(`用户 ${id} 未添加课程 ${curriculumId}`, HttpStatus.FORBIDDEN)
  }
}

export class UserNotHasTheLesson extends HttpException {
  constructor (id: string, lessonId: string) {
    super(`用户 ${id} 未添加课程 ${lessonId}`, HttpStatus.FORBIDDEN)
  }
}

export class LessonNotFoundException extends HttpException {
  constructor (id: string) {
    super(`课程 ${id} 不存在`, HttpStatus.FORBIDDEN)
  }
}

export class UserAlreadyHasTheDeadline extends HttpException {
  constructor (id: string, deadlineId: string) {
    super(`用户 ${id} 早已添加 deadline ${deadlineId}`, HttpStatus.FORBIDDEN)
  }
}

export class PostNotFoundException extends HttpException {
  constructor (id: string) {
    super(`帖子 ${id} 不存在`, HttpStatus.FORBIDDEN)
  }
}

export class FileNameCannotBeNullException extends HttpException {
  constructor () {
    super('图片文件名不能为空', HttpStatus.FORBIDDEN)
  }
}

export class CommentNotFoundException extends HttpException {
  constructor (id: string) {
    super(`评论 ${id} 不存在`, HttpStatus.FORBIDDEN)
  }
}

export class Code2SessionErrorException extends HttpException {
  constructor (err: string) {
    super(`code2Session error: ${err}`, HttpStatus.FORBIDDEN)
  }
}

export class UnionIdBeNullException extends HttpException {
  constructor () {
    super('unionId 不能为空', HttpStatus.FORBIDDEN)
  }
}
