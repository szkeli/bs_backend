import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient } from 'dgraph-js'

import { DbService, Txn } from 'src/db/db.service'

import {
  SystemErrorException,
  UniversityNotFoundException,
  UserNotFoundException
} from '../app.exception'
import { ORDER_BY } from '../connections/models/connections.model'
import { StringMap } from '../db/model/db.model'
import { RelayPagingConfigArgs } from '../posts/models/post.model'
import {
  handleRelayForwardAfter,
  now,
  relayfyArrayForward,
  RelayfyArrayParam
} from '../tool'
import { UniversitiesService } from '../universities/universities.service'
import {
  CreateSubjectArgs,
  QuerySubjectsFilter,
  Subject,
  SubjectId,
  SubjectsConnectionWithRelay,
  UpdateSubjectArgs
} from './model/subject.model'

@Injectable()
export class SubjectService {
  private readonly dgraph: DgraphClient
  constructor (
    private readonly dbService: DbService,
    private readonly universityService: UniversitiesService
  ) {
    this.dgraph = dbService.getDgraphIns()
  }

  async subjectsWithRelay (
    { orderBy, first, after }: RelayPagingConfigArgs,
    filter: QuerySubjectsFilter
  ): Promise<SubjectsConnectionWithRelay> {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.subjectsWithRelayForward(first, after, filter)
    }

    throw new ForbiddenException('undefined')
  }

  async subjectsWithRelayForward (
    first: number,
    after: string | null,
    { universityId }: QuerySubjectsFilter
  ): Promise<SubjectsConnectionWithRelay> {
    const q1 =
      'var(func: uid(subjects), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const university = universityId
      ? `
      var(func: uid($universityId)) @filter(type(University)) {
        subjects as subjects(orderdesc: createdAt) @filter(type(Subject) and not has(delete))
      }
    `
      : `
      var(func: type(Subject), orderdesc: createdAt) @filter(not has(delete)) {
        subjects as uid
      }
    `
    const query = `
      query v($after: string, $universityId: string) {
        ${university}
        ${after ? q1 : ''}
        totalCount(func: uid(subjects)) {
          count(uid)
        }
        objs(func: uid(${
          after ? 'q' : 'subjects'
        }), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(subjects), first: -1) { createdAt }
        endO(func: uid(subjects), first: 1) { createdAt }
      }
    `

    const res = await this.dbService.commitQuery<RelayfyArrayParam<Subject>>({
      query,
      vars: { $after: after, $universityId: universityId }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async deleteSubject (actorId: string, subjectId: string) {
    const _now = now()
    const query = `
      query v($actorId: string, $subjectId: string) {
        v(func: uid($actorId)) { v as uid }
        u(func: uid($subjectId)) @filter(type(Subject)) { u as uid }
        # actor 是管理员
        x(func: uid($actorId)) @filter(type(Admin)) { x as uid }
        # actor 是subject的创建者
        y(func: uid($subjectId)) @filter(uid_in(creator, $actorId)) { y as uid }
        # subject 未被删除
        d(func: uid($subjectId)) @filter(not has(delete)) { d as uid }
      }
     `
    // actor是管理员
    const conditions1 =
      '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 1) and eq(len(y), 0) and eq(len(d), 1) )'
    // actor是subject的创建者
    const conditions2 =
      '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 0) and eq(len(y), 1) and eq(len(d), 1) )'
    const mutation = {
      uid: '_:delete',
      'dgraph.type': 'Delete',
      createdAt: _now,
      to: {
        uid: subjectId,
        delete: {
          uid: '_:delete'
        }
      },
      creator: {
        uid: actorId,
        deletes: {
          uid: '_:delete'
        }
      }
    }
    const res = await this.dbService.commitConditionalUperts<
    Map<string, string>,
    {
      v: Array<{ uid: string }>
      u: Array<{ uid: string }>
      x: Array<{ uid: string }>
      y: Array<{ uid: string }>
      d: Array<{ uid: string }>
    }
    >({
      mutations: [
        { mutation, condition: conditions1 },
        { mutation, condition: conditions2 }
      ],
      query,
      vars: {
        $actorId: actorId,
        $subjectId: subjectId
      }
    })

    if (res.json.x.length !== 1 && res.json.y.length !== 1) {
      throw new ForbiddenException(
        `${actorId} 既不是 ${subjectId} 的创建者也不是管理员`
      )
    }

    if (res.json.d.length !== 1) {
      throw new ForbiddenException(`主题 ${subjectId} 已被删除`)
    }

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`操作者 ${actorId} 不存在`)
    }

    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`主题 ${subjectId} 不存在`)
    }

    return {
      id: res.uids.get('delete'),
      createdAt: _now
    }
  }

  async subject (id: SubjectId) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
      query v($uid: string) {
        subject(func: uid($uid)) {
          id: uid
          createdAt
          title
          description
          avatarImageUrl
          backgroundIMageUrl
        }
      }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .queryWithVars(query, { $uid: id })
      return res.getJson().subject[0] as unknown as Subject
    } finally {
      await txn.discard()
    }
  }

  async updateSubject (
    actorId: string,
    subjectId: string,
    args: UpdateSubjectArgs
  ) {
    const query = `
      query v($actorId: string, $subjectId: string) {
        v(func: uid($actorId)) @filter(type(Admin) or type(User)) { v as uid }
        u(func: uid($subjectId)) @filter(type(Subject)) { u as uid }
        x(func: uid($actorId)) @filter(type(Admin)) { x as uid }
        y(func: uid($subjectId)) @filter(uid_in(creator, $actorId)) { y as uid }
        d(func: uid($subjectId)) @filter(type(Subject) and not has(delete)) { d as uid }
        subject(func: uid($subjectId)) @filter(type(Subject)) {
          id: uid
          expand(_all_)
        }
      }
    `
    // 操作者是管理员
    const condition1 =
      '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 1) and eq(len(y), 0) and eq(len(d), 1))'
    // 操作者是 subject 创建者
    const condition2 =
      '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 0) and eq(len(y), 1) and eq(len(d), 1))'

    const mutation = {
      uid: subjectId,
      'dgraph.type': 'Subject'
    }

    Object.assign(mutation, args)

    const res = await this.dbService.commitConditionalUperts<
    Map<string, string>,
    {
      v: Array<{ uid: string }>
      u: Array<{ uid: string }>
      x: Array<{ uid: string }>
      y: Array<{ uid: string }>
      d: Array<{ uid: string }>
      subject: Subject[]
    }
    >({
      mutations: [
        { mutation, condition: condition1 },
        { mutation, condition: condition2 }
      ],
      query,
      vars: {
        $actorId: actorId,
        $subjectId: subjectId
      }
    })

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`操作者 ${actorId} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`主题 ${subjectId} 不存在`)
    }
    if (res.json.d.length !== 1) {
      throw new ForbiddenException(`主题 ${subjectId} 已被删除`)
    }
    if (res.json.x.length !== 1 && res.json.y.length !== 1) {
      throw new ForbiddenException(
        `操作者 ${actorId} 既不是 ${subjectId} 的创建者也不是管理员`
      )
    }

    Object.assign(res.json.subject[0], args)

    return res.json.subject[0]
  }

  async addSubjectToUniversityTxn (
    txn: Txn,
    subjectId: string,
    universityId: string
  ) {
    const query = `
      query v($universityId: string, $subjectId: string) {
        u(func: uid($universityId)) @filter(type(University)) {
          u as uid
        }
        s(func: uid($subjectId)) { s as uid }
      }
    `
    const cond = '@if( eq(len(u), 1) )'
    const mut = {
      uid: 'uid(u)',
      subjects: {
        uid: 'uid(s)'
      }
    }
    const res = await this.dbService.handleTransaction<
    StringMap,
    {
      u: Array<{ uid: string }>
    }
    >(txn, {
      query,
      mutations: [{ set: mut, cond }],
      vars: { $universityId: universityId, $subjectId: subjectId }
    })

    if (res.json.u.length !== 1) {
      throw new UniversityNotFoundException(universityId)
    }
  }

  async createSubjectTxn (txn: Txn, id: string, params: CreateSubjectArgs) {
    const { universityId, universityName, ...args } = params
    const query = `
      query v($id: string) {
        q(func: uid($id)) @filter(type(User) or type(Admin)) { q as uid }
      }
    `
    const condition = '@if( eq(len(q), 1) )'
    const mutation = {
      uid: 'uid(q)',
      subjects: {
        uid: '_:subject',
        'dgraph.type': 'Subject',
        ...args,
        createdAt: now(),
        creator: {
          uid: 'uid(q)'
        }
      }
    }
    const res = await this.dbService.handleTransaction<
    StringMap,
    {
      q: Array<{ uid: string }>
    }
    >(txn, {
      query,
      mutations: [{ set: mutation, cond: condition }],
      vars: { $id: id }
    })

    if (res.json.q.length !== 1) {
      throw new UserNotFoundException(id)
    }

    const _id = res.uids.get('subject')
    if (!_id) throw new SystemErrorException()

    return {
      id: _id,
      createdAt: now(),
      ...args
    }
  }

  /**
   * 创建一个新的主题
   * @param id 创建 Subject 的 User 的 id
   * @param param1 相关参数
   * @returns Promise<Subject>
   */
  async createSubject (id: string, params: CreateSubjectArgs): Promise<Subject> {
    const { universityId, universityName } = params
    const res = await this.dbService.withTxn(async txn => {
      const subject = await this.createSubjectTxn(txn, id, params)

      const universities = await this.universityService.findUniversityByIdOrNameTxn(txn, {
        universityId,
        universityName
      })

      if (universities.length === 0) {
        throw new UniversityNotFoundException(universityId ?? universityName ?? 'N/A')
      }
      if (universities.length > 1) {
        throw new ForbiddenException('universityName 匹配到多个学校')
      }
      await this.addSubjectToUniversityTxn(txn, subject.id, universities[0].id)
      return subject
    })

    return res
  }

  async findSubjectByPostId (id: string) {
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(Post)) {
          subject as ~posts @filter(type(Subject))
        }
        subject(func: uid(subject)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      subject: Subject[]
    }>({
      query,
      vars: { $id: id }
    })

    return res.subject[0]
  }
}
