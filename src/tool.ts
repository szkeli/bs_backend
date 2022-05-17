import { ForbiddenException } from '@nestjs/common'
import axios from 'axios'
import * as crypto from 'crypto'
import { verify } from 'jsonwebtoken'

import { Code2SessionErrorException } from './app.exception'
import { Lesson, LessonItem } from './lessons/models/lessons.model'
import { IImage, Nullable } from './posts/models/post.model'
import { TASK_TYPE } from './tasks/models/tasks.model'
import { AuthenticationInfo, CODE2SESSION_GRANT_TYPE, UpdateUserArgs, User, UserWithFacets, UserWithPrivateProps } from './user/models/user.model'

export async function exec<T, U> (l: string, bindings: object, aliases?: object) {
  return await axios.post<T>('http://w3.onism.cc:8084/gremlin', {
    gremlin: l,
    bindings,
    language: 'gremlin-groovy',
    aliases: aliases || {
      graph: 'hugegraph',
      g: 'hugegraph'
    }
  }).then<U>(data => data.data as unknown as U)
}

export function sha1 (content: string) {
  const h = crypto.createHash('sha1')
  h.update(content)
  return h.digest('hex')
}

export function hash (content: any) {
  const v = `${JSON.stringify(content)}:${Date.now()}`
  const h = crypto.createHash('sha256')
  h.update(v)
  return h.digest('hex')
}

export function sign (s: string) {
  const h1 = crypto.createHash('sha512')
    .update(s)
    .digest('hex')
  const h2 = crypto.createHash('sha512')
    .update(h1)
    .digest('hex')
  return h2
}

export function uuid () {
  const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
  return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4())
}

export async function code2Session (code: string, grantType: CODE2SESSION_GRANT_TYPE) {
  const appId = grantType === CODE2SESSION_GRANT_TYPE.BLANK_SPACE ? process.env.APP_ID : process.env.APP_ID_2
  const secret = grantType === CODE2SESSION_GRANT_TYPE.BLANK_SPACE ? process.env.APP_SECRET : process.env.APP_SECRET_2

  const url = 'https://api.weixin.qq.com/sns/jscode2session'
  // ?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=${grantType}
  const res = await axios({
    method: 'GET',
    url,
    params: {
      appid: appId,
      secret,
      js_code: code,
      grant_type: 'authorization_code'
    }
  })
    .then(r => r.data as unknown as {
      openid: string
      session_key: string
      unionid: string
      errcode: number
      errmsg: string
    })

  if (res.errcode && res.errcode !== 0) {
    throw new Code2SessionErrorException(res.errmsg)
  }

  return {
    openId: res.openid,
    unionId: res.unionid,
    sessionKey: res.session_key,
    errcode: res.errcode,
    errmsg: res.errmsg
  } as unknown as {
    openId: string
    unionId: string
    sessionKey: string
    errmsg: string
    errcode: number
  }
}
export const now = () => new Date().toISOString()

export const DeletePrivateValue = function <T>(userWithFacets?: UserWithFacets) {
  if (!userWithFacets) return null
  const map = new Map(Object.entries(userWithFacets))
  for (const [key, value] of map.entries()) {
    const v = key.split('|')
    v.length === 2 && map.has(v[0]) && value === true && map.delete(v[0])
  }
  return Object.fromEntries<string>(map.entries()) as unknown as Nullable<T>
}

export const UpdateUserArgs2User = function <T>(updateUserArgs: UpdateUserArgs) {
  const map = new Map(Object.entries(updateUserArgs))

  for (const [key, value] of map.entries()) {
    if (typeof value === 'object' && value.value) {
      map.set(key, value.value)
      map.set(`${key}|private`, value?.isPrivate ?? false)
    }
  }

  return Object.fromEntries(map.entries()) as unknown as T
}

export const RawUser2UserWithPrivateProps = function (user: User): UserWithPrivateProps {
  const map = new Map(Object.entries(user))

  const upper = (v: string) => v.slice(0, 1).toUpperCase() + v.slice(1)
  for (const [key, value] of map.entries()) {
    const lv = key.split('|')
    if (typeof value === 'boolean' && lv.length === 2) {
      map.delete(key)
      map.set(`is${upper(lv[0])}${upper(lv[1])}`, value)
    }
  }

  return Object.fromEntries(map.entries()) as unknown as UserWithPrivateProps
}

export const atob = function (content?: string | null): string | null {
  if (!content) return null
  return Buffer.from(content, 'utf-8').toString('base64')
}

export const btoa = function (content?: string | null): string | null {
  if (!content) return null
  return Buffer.from(content, 'base64').toString('utf-8')
}

export const edgify = function <T>(vs: Array<T & {'createdAt': string}>): Array<{node: T, cursor: string}> {
  return vs.map(v => ({ node: v, cursor: atob(v.createdAt) }))
}
export const edgifyByCreatedAt = function <T extends {createdAt: string}>(vs: T[]) {
  return vs.map(v => ({ node: v, cursor: atob(v.createdAt) }))
}

export const edgifyByXid = function <T>(vs: Array<T & {'id': string}>) {
  return vs.map(v => ({ node: v, cursor: v.id }))
}
export const edgifyByKey = function <T>(vs: T[], key: string): Array<{node: T, cursor: string}> {
  return vs.map(v => ({ node: v, cursor: getCurosrByScoreAndId((v as any).id, v[key]) }))
}

export const getCurosrByScoreAndId = function (id: string, score: number): string {
  if (score === null || score === undefined) return null
  return atob(JSON.stringify({ id, score: score.toString() }))
}

export const handleRelayForwardAfter = function (after: string) {
  return btoa(after)
}
export const handleRelayBackwardBefore = function (before: string) {
  return btoa(before)
}

export interface RelayfyArrayParam <T extends {createdAt: string}> {
  totalCount: Array<{count: number}>
  objs: T[]
  startO: Array<{createdAt: string}>
  endO: Array<{createdAt: string}>
  first: number
  after: string | null
}

export const relayfyArrayForward = function<T extends {createdAt: string}> ({
  totalCount,
  objs,
  startO,
  endO,
  first,
  after
}: RelayfyArrayParam<T>) {
  const _lastO = objs?.slice(-1)[0]
  const _totalCount = totalCount[0]?.count ?? 0
  const _startO = startO[0]
  const _endO = endO[0]

  const v = _totalCount !== 0
  const hasNextPage = _endO?.createdAt !== _lastO?.createdAt && _endO?.createdAt !== after && objs?.length === first && _totalCount !== first
  const hasPreviousPage = after !== _startO?.createdAt && !!after

  return {
    totalCount: _totalCount,
    pageInfo: {
      startCursor: atob(objs[0]?.createdAt),
      endCursor: atob(_lastO?.createdAt),
      hasNextPage: hasNextPage && v,
      hasPreviousPage: hasPreviousPage && v
    },
    edges: edgifyByCreatedAt<T>(objs ?? [])
  }
}

export const ids2String = function (ids: string[]) {
  ids = Array.from(new Set(ids))
  ids?.map(id => `"${id}"`)
  return ids?.toString()
}

export const getAuthenticationInfo = function (token: string): AuthenticationInfo {
  const tokenRes = verify(token, process.env.USER_AUTHEN_JWT_SECRET) as AuthenticationInfo

  const require = [
    'avatarImageUrl',
    'studentId',
    'school',
    'subCampus',
    'gender',
    'college',
    'grade',
    'name'
  ]
  // const require = Object.keys(AuthenticationInfo)
  const has = Object.keys(tokenRes) || []
  const c = has.concat(require)

  // 缺少的元素
  const lack = c.filter(v => require.includes(v) && !has.includes(v))
  // 未知的多余元素
  const unknown = c.filter(v => !require.includes(v) && has.includes(v))

  if (lack.length !== 0) {
    throw new ForbiddenException(`autoAuthenUserSelf 时，AuthenticationInfo 缺少 ${lack.toString()} 元素`)
  }

  if (unknown.length !== 0) {
    throw new ForbiddenException(`autoAuthenUserSelf 时，AuthenticationInfo 中 ${unknown.toString()} 属性作用未定义`)
  }

  return {
    avatarImageUrl: tokenRes.avatarImageUrl,
    studentId: tokenRes.studentId,
    school: tokenRes.school,
    subCampus: tokenRes.subCampus,
    college: tokenRes.college,
    gender: tokenRes.gender,
    grade: tokenRes.grade,
    roles: tokenRes.roles,
    name: tokenRes.name
  }
}

/**
 * 通过上课时间表格式化
 * TODO test
 * @returns [1,2节] 08:30-09:55
 */
export const fmtLessonTimeByDayInWeekThroughSchoolTimeTable = (start: number, end: number) => {
  const startTable = [
    '08:30', '09:15', '10:15',
    '11:00', '11:45', '13:30',
    '14:15', '15:00', '16:00',
    '16:45', '19:00', '19:00',
    '20:30', '20:30'
  ]
  const endTable = [
    '09:10', '09:55', '10:55',
    '11:40', '12:25', '14:10',
    '14:55', '15:40', '16:40',
    '17:25', '20:20', '20:20',
    '21:45', '21:45'
  ]
  if (start - 1 > startTable.length) {
    throw new ForbiddenException('start can not exceed startTable.length')
  }
  if (end - 1 > endTable.length) {
    throw new ForbiddenException('end can not exceed endTable.lenght')
  }

  return `[${start},${end}节] ${startTable[start - 1]}-${endTable[end - 1]}`
}

export const fmtLessonItems = (items: LessonItem[]) =>
  items
    .map(item => fmtLessonTimeByDayInWeekThroughSchoolTimeTable(item.start, item.end))
    .join('\n')

export type LessonNotificationTemplateItem = Array<LessonItem & { lesson: Lesson[] }>

export const getLessonNotificationTemplate = (openId: string, items: LessonNotificationTemplateItem, taskType: TASK_TYPE) => {
  const a = taskType === TASK_TYPE.GM ? '今天' : '明天'
  const b = process.env.NODE_ENV === 'production' ? '' : '测试：'

  return {
    touser: openId,
    mp_template_msg: {
      // 服务号 appId
      appid: 'wxfcf7b19fdd5d9770',
      template_id: '49nv12UdpuLNktBfXNrH61-ci3x71_FX8hhAew8fQoQ',
      url: 'http://weixin.qq.com/download',
      miniprogram: {
        appid: 'wx10ac1dfea0e2b8c6',
        pagepath: '/pages/index/index'
      },
      data: {
        first: {
          value: `${b}${a}你有${items.length ?? 'N/A'}门课程`
        },
        // 所有课程
        // 线性代数；音乐；体育；（列举全部课程用分号连接）
        keyword1: {
          value: items
            .map(i => ({ start: i.start, end: i.end, i }))
            .sort((a, b) => a.start - b.start)
            .map(({ start, end, i }) => i.lesson[0]?.name ?? 'N/A')
            .join('\n') ?? 'N/A'
        },
        // 课程名称和时间
        // 【1，2节】8:30-9：55 线性代数
        // 【1，2节】8:30-9：55 线性代数
        keyword2: {
          value: items
            .map(i => ({ start: i.start, end: i.end, i }))
            .sort((a, b) => a.start - b.start)
            .map(({ start, end, i }) => `${fmtLessonTimeByDayInWeekThroughSchoolTimeTable(i.start, i.end)} ${i.lesson[0]?.name ?? 'N/A'}`)
            .join('\n')
        },
        // 上课地点
        // 【1，2节】师院B204
        // 【1，2节】师院B204
        keyword3: {
          value: items
            .map(i => ({ start: i.start, end: i.end, i }))
            .sort((a, b) => a.start - b.start)
            .map(({ start, end, i }) => `[${i.start},${i.end}节] ${i?.destination ?? 'N/A'}`)
            .join('\n')
        },
        remark: {
          value: '详情请点击进入小程序查看'
        }
      }
    }
  }
}

export const sleep = async (ms: number) => await new Promise(resolve => setTimeout(resolve, ms))
export const imagesV2fy = (images: string[]) => (
  images?.map((image, index) => (
    {
      uid: `_:image_${index}`,
      'dgraph.type': 'Image',
      value: image,
      index
    }
  ))
)

export const imagesV2ToImages = (images: IImage[]) => (
  images?.map(i => (i.value))
)
