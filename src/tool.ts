import { ForbiddenException } from '@nestjs/common'
import axios from 'axios'
import * as crypto from 'crypto'
import { verify } from 'jsonwebtoken'

import { Nullable } from './posts/models/post.model'
import { AuthenticationInfo, GENDER, UpdateUserArgs, User, UserWithFacets, UserWithPrivateProps } from './user/models/user.model'

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

export async function code2Session (code: string) {
  const appId = process.env.APP_ID
  const secret = process.env.APP_SECRET
  const grantType = 'authorization_code'
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=${grantType}`

  const res = await axios
    .get(url)
    .then(r => r.data as unknown as {
      openid: string
      session_key: string
      unionid: string
      errcode: number
      errmsg: string
    })

  if (res.errcode && res.errcode !== 0) {
    throw new ForbiddenException(`code2Session error: ${res.errmsg}`)
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

export const relayfyArrayForward = function<T extends {createdAt: string}> ({
  totalCount,
  objs,
  startO,
  endO,
  first,
  after
}: {
  totalCount: Array<{count: number}>
  objs: T[]
  startO: Array<{createdAt: string}>
  endO: Array<{createdAt: string}>
  first: number
  after: string | null
}) {
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

  return {
    studentId: tokenRes.studentId,
    school: tokenRes.school,
    subCampus: tokenRes.subCampus,
    college: tokenRes.college,
    gender: tokenRes.gender,
    grade: tokenRes.grade
  }
}

export const getAvatarImageUrlByGender = function (gender: GENDER) {
  const baseUrl = 'https://dev-1306842204.cos.ap-guangzhou.myqcloud.com'
  const defaultAvatars = {
    [GENDER.MALE]: `${baseUrl}/defaultAvatars/male.jpg`,
    [GENDER.FEMALE]: `${baseUrl}/defaultAvatars/female.jpg`,
    [GENDER.NONE]: `${baseUrl}/defaultAvatars/anonymous.jpg`
  }
  return defaultAvatars[gender] ?? defaultAvatars[GENDER.NONE]
}
