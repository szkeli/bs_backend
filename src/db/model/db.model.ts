
export type UserId = string
export type PostId = string
export type Time = number

export class CreateUserDto {
  name: string
  createAt: Time
  lastLoginAt: Time
  avatarUrl: string
  unionId: string
  openId: string
  school: string
  grade: string
  gender: string
}

export class FollowAPersonDto {
  /**
   * 关注者
   */
  from: UserId
  /**
   * 被关注者
   */
  to: UserId
}
