import { HttpException, HttpStatus } from '@nestjs/common'

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
