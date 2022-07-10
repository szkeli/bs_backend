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

export class UniversityNotAllExistException extends HttpException {
  constructor (ids: string[]) {
    super(`请求数据 ${ids.toString()} 存在未定义的大学的 id`, HttpStatus.FORBIDDEN)
  }
}

export class InstituteNotAllExistException extends HttpException {
  constructor (ids: string[]) {
    super(`请求数据 ${ids.toString()} 存在未定义的学院的 id`, HttpStatus.FORBIDDEN)
  }
}

export class SubCampusNotAllExistException extends HttpException {
  constructor (ids: string[]) {
    super(`请求数据 ${ids.toString()} 存在未定义的校区的 id`, HttpStatus.FORBIDDEN)
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

export class SubjectNotFoundException extends HttpException {
  constructor (id: string) {
    super(`主题 ${id} 不存在`, HttpStatus.FORBIDDEN)
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
  constructor (id: string, lessonId: string) {
    super(`用户 ${id} 早已添加课程 ${lessonId}`, HttpStatus.FORBIDDEN)
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

export class UserNotHasLessonsTodayExcepton extends HttpException {
  constructor (id: string) {
    super(`用户 ${id} 今天没有课程`, HttpStatus.FORBIDDEN)
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

export class BadOpenIdException extends HttpException {
  constructor (to: string) {
    super(`用户 ${to} 的 openId 在此处不适用`, HttpStatus.FORBIDDEN)
  }
}

export class LessonMetaDataLengthException extends HttpException {
  constructor (len: number) {
    super(`LessonMetaData 长度: ${len} 不为1`, HttpStatus.FORBIDDEN)
  }
}
export class CannotCommentUser extends HttpException {
  constructor () {
    super('不能在第一级评论回复一个 User', HttpStatus.FORBIDDEN)
  }
}

export class UserAlreayAddUpvoteOnIt extends HttpException {
  constructor (id: string, it: string) {
    super(`用户 ${id} 已经点赞 ${it}`, HttpStatus.FORBIDDEN)
  }
}

export class ContentLenExceedException extends HttpException {
  constructor (len: number) {
    super(`内容长度不能大于 ${len}`, HttpStatus.FORBIDDEN)
  }
}

export class UniversityAlreadyExsistException extends HttpException {
  constructor (name: string) {
    super(`大学 ${name} 已存在`, HttpStatus.FORBIDDEN)
  }
}

export class UniversityHasBeenDeletedException extends HttpException {
  constructor (id: string) {
    super(`大学 ${id} 已被删除`, HttpStatus.FORBIDDEN)
  }
}

export class UniversityNotFoundException extends HttpException {
  constructor (id: string) {
    super(`大学 ${id} 不存在`, HttpStatus.FORBIDDEN)
  }
}

export class SubCampusAlreadyAtTheUniversityExxception extends HttpException {
  constructor (id: string, name: string) {
    super(`大学 ${id} 已有名为 ${name} 的校区`, HttpStatus.FORBIDDEN)
  }
}

export class SubCampusNotFoundException extends HttpException {
  constructor (id: string) {
    super(`校区 ${id} 不存在`, HttpStatus.FORBIDDEN)
  }
}

export class InstituteAlreadyAtTheUniversityException extends HttpException {
  constructor (id: string, name: string) {
    super(`大学 ${id} 已有名为 ${name} 的学院`, HttpStatus.FORBIDDEN)
  }
}

export class InstituteNotFoundException extends HttpException {
  constructor (id: string) {
    super(`学院 ${id} 不存在`, HttpStatus.FORBIDDEN)
  }
}
export class IncorrectPasswordException extends HttpException {
  constructor () {
    super('密码错误', HttpStatus.FORBIDDEN)
  }
}

export class LackSomeOfPropsException extends HttpException {
  constructor (lack: string[]) {
    super(`autoAuthenUserSelf 时，AuthenticationInfo 缺少 ${lack.toString()} 属性`, HttpStatus.FORBIDDEN)
  }
}

export class UnknownPropsException extends HttpException {
  constructor (unknown: string[]) {
    super(`autoAuthenUserSelf 时，AuthenticationInfo 中 ${unknown.toString()} 属性作用未定义`, HttpStatus.FORBIDDEN)
  }
}

export class InstitutesOrSubCampusesNotAllInTheUniversityException extends HttpException {
  constructor (institutes: string[], subCampuses: string[], universities: string[]) {
    super(`institutes: ${institutes.toString()} 对应的 universities 和 SubCampuses: ${subCampuses.toString()} 对应的 universities 不完全等于 ${universities.toString()}}`, HttpStatus.FORBIDDEN)
  }
}

export class UserAlreadyCheckInException extends HttpException {
  constructor (id: string) {
    super(`用户 ${id} 已经签到`, HttpStatus.FORBIDDEN)
  }
}

export class ParseCursorFailedException extends HttpException {
  constructor (cursor: string) {
    super(`游标 ${cursor} 解析失败`, HttpStatus.FORBIDDEN)
  }
}

export class SystemErrorException extends HttpException {
  constructor (m?: string) {
    super(`SystemError: ${m ?? '未知错误'}`, HttpStatus.FORBIDDEN)
  }
}

export class NotImplementedException extends HttpException {
  constructor () {
    super('Method not implemented', HttpStatus.FORBIDDEN)
  }
}

export class RelayPagingConfigErrorException extends HttpException {
  constructor (error: string) {
    super(`RelayPagingConfigError: ${error}`, HttpStatus.FORBIDDEN)
  }
}

export class SubjectNotInTheUniversityException extends HttpException {
  constructor (universityId: string | null, subjectId: string | null) {
    super(`University ${universityId ?? 'N/A'} 不存在 ${subjectId ?? 'N/A'} Subject`, HttpStatus.FORBIDDEN)
  }
}

export class AlreadyInFavoritesException extends HttpException {
  constructor (userId: string, toId: string) {
    super(`User ${userId} 已经收藏 ${toId}`, HttpStatus.FORBIDDEN)
  }
}

export class UserNotHasTheFavoriteException extends HttpException {
  constructor (userId: string, favoriteId: string) {
    super(`User ${userId} not has the favorite ${favoriteId}`, HttpStatus.FORBIDDEN)
  }
}

export class FavoriteNotExistException extends HttpException {
  constructor (favoriteId: string) {
    super(`favorite ${favoriteId} not exist`, HttpStatus.FORBIDDEN)
  }
}
