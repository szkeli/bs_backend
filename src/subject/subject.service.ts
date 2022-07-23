import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient } from 'dgraph-js'

import { DbService } from 'src/db/db.service'

import { SystemErrorException, UniversityNotFoundException, UserNotFoundException } from '../app.exception'
import { ORDER_BY } from '../connections/models/connections.model'
import { Post, PostsConnection, RelayPagingConfigArgs } from '../posts/models/post.model'
import { SubField } from '../subfields/models/subfields.model'
import { atob, btoa, edgifyByCreatedAt, edgifyByKey, getCurosrByScoreAndId, handleRelayForwardAfter, now, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { University } from '../universities/models/universities.models'
import { User } from '../user/models/user.model'
import {
  CreateSubjectArgs,
  QuerySubjectsFilter,
  Subject,
  SubjectId,
  SubjectsConnection,
  SubjectsConnectionWithRelay,
  UpdateSubjectArgs
} from './model/subject.model'

@Injectable()
export class SubjectService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async subFields (id: string) {
    const query = `
      query v($id: string) {
        s(func: type(SubField)) @filter(uid_in(subject, uid(subject))) {
          id: uid
          expand(_all_)
        }
        var(func: uid($id)) @filter(type(Subject)) {
          subject as uid
        }
      }
    `
    const res = await this.dbService.commitQuery<{s: SubField[]}>({ query, vars: { $id: id } })
    return res.s
  }

  async universities (id: string, { first, after, orderBy }: RelayPagingConfigArgs) {
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.universitiesRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async universitiesRelayForward (id: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(universities), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(Subject)) {
          universities as ~subjects @filter(type(University))
        }
        ${after ? q1 : ''}
        totalCount(func: uid(universities)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'universities'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(universities), first: -1) { createdAt }
        endO(func: uid(universities), first: 1) { createdAt }
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<University>>({
      query,
      vars: { $id: id, $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async subjectsWithRelay ({ orderBy, first, after }: RelayPagingConfigArgs, filter: QuerySubjectsFilter): Promise<SubjectsConnectionWithRelay> {
    after = handleRelayForwardAfter(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.subjectsWithRelayForward(first, after, filter)
    }

    throw new ForbiddenException('undefined')
  }

  async subjectsWithRelayForward (first: number, after: string | null, { universityId }: QuerySubjectsFilter): Promise<SubjectsConnectionWithRelay> {
    const q1 = 'var(func: uid(subjects), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
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
        objs(func: uid(${after ? 'q' : 'subjects'}), orderdesc: createdAt, first: ${first}) {
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

  async postsWithRelayForward (subjectId: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(posts), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($subjectId: string, $after: string) {
        var(func: uid($subjectId)) @filter(type(Subject)) {
          posts as posts(orderdesc: createdAt) @filter(not has(delete))
        }

        ${after ? q1 : ''}
        totalCount(func: uid(posts)) { count(uid) }
        posts(func: uid(${after ? 'q' : 'posts'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startPost(func: uid(posts), first: -1) {
          id: uid
          createdAt
        }
        # 结束游标
        endPost(func: uid(posts), first: 1) {
          id: uid
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      posts: Post[]
      startPost: Array<{id: string, createdAt: string}>
      endPost: Array<{id: string, createdAt: string}>
    }>({ query, vars: { $subjectId: subjectId, $after: after } })

    const totalCount = res.totalCount[0]?.count ?? 0
    const v = totalCount !== 0
    const startPost = res.startPost[0]
    const endPost = res.endPost[0]
    const lastPost = res.posts?.slice(-1)[0]

    const hasNextPage = endPost?.createdAt !== lastPost?.createdAt && endPost?.createdAt !== after && res.posts.length === first && totalCount !== first
    const hasPreviousPage = after !== startPost?.createdAt && !!after

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      edges: edgifyByCreatedAt(res.posts ?? []),
      pageInfo: {
        endCursor: atob(lastPost?.createdAt),
        startCursor: atob(res.posts[0]?.createdAt),
        hasNextPage: hasNextPage && v,
        hasPreviousPage: hasPreviousPage && v
      }
    }
  }

  async postsWithRelay (id: string, { first, after, last, before, orderBy }: RelayPagingConfigArgs) {
    after = btoa(after)
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.postsWithRelayForward(id, first, after)
    }

    if (first && orderBy === ORDER_BY.TRENDING) {
      if (after) {
        try {
          after = JSON.parse(after).score
        } catch {
          throw new ForbiddenException(`解析游标失败 ${after ?? ''}`)
        }
      }
      return await this.trendingPostsWithRelayForward(id, first, after)
    }
  }

  async trendingPostsWithRelayForward (subjectId: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(posts), orderdesc: val(score)) @filter(lt(val(score), $after)) { q as uid }'
    const query = `
      query v($subjectId: string, $after: string) {
        var(func: uid($subjectId)) @filter(not has(delete)) {
          tposts as posts @filter(not has(delete))  
        }

        v as var(func: uid(tposts)) @filter(not has(delete)) {
          voteCount as count(votes @filter(type(Vote)))
          # TODO
          c as count(comments @filter(type(Comment)))
          commentsCount as math(c * 3)
          createdAt as createdAt
        
          hour as math(
            0.75*(since(createdAt)/216000)
          )
          score as math((voteCount + commentsCount)* hour)
        }
        posts as var(func: uid(v)) @filter(gt(val(score), 0))

        ${after ? q1 : ''}
        
        totalCount(func: uid(posts)) { count(uid) }
        posts(func: uid(${after ? 'q' : 'posts'}), orderdesc: val(score), first: ${first}) {
          score: val(score)
          id: uid
          expand(_all_)
        }
        # 开始游标
        startPost(func: uid(posts), orderdesc: val(score), first: 1) {
          id: uid
          score: val(score)
        }
        # 结束游标
        endPost(func: uid(posts), orderdesc: val(score), first: -1) {
          id: uid
          score: val(score)
        }
      }
    `

    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      posts: Array<Post & {score: number}>
      startPost: Array<{score: number}>
      endPost: Array<{score: number}>
    }>({ query, vars: { $after: after, $subjectId: subjectId } })

    const totalCount = res.totalCount[0]?.count ?? 0
    const v = totalCount !== 0

    const firstPost = res.posts[0]
    const lastPost = res.posts?.slice(-1)[0]
    const startPost = res.startPost[0]
    const endPost = res.endPost[0]
    const startCursor = getCurosrByScoreAndId(firstPost?.id, firstPost?.score)
    const endCursor = getCurosrByScoreAndId(lastPost?.id, lastPost?.score)

    const hasNextPage = endPost?.score !== lastPost?.score && res.posts.length === first && endPost?.score?.toString() !== after
    const hasPreviousPage = after !== startPost?.score?.toString() && !!after

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      edges: edgifyByKey(res.posts ?? [], 'score'),
      pageInfo: {
        startCursor,
        endCursor,
        hasNextPage: hasNextPage && v,
        hasPreviousPage: hasPreviousPage && v
      }
    }
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
    const conditions1 = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 1) and eq(len(y), 0) and eq(len(d), 1) )'
    // actor是subject的创建者
    const conditions2 = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 0) and eq(len(y), 1) and eq(len(d), 1) )'
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
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{uid: string}>
      y: Array<{uid: string}>
      d: Array<{uid: string}>
    }>({
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
      throw new ForbiddenException(`${actorId} 既不是 ${subjectId} 的创建者也不是管理员`)
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

  async subjects (first: number, offset: number): Promise<SubjectsConnection> {
    const query = `
        query {
          var(func: type(Subject)) @filter(not has(delete)) {
            subjects as uid
          }
          totalCount(func: uid(subjects)) {
            count(uid)
          }
          subjects(func: uid(subjects), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
            id: uid
            expand(_all_)
          }
        }
      `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      subjects: Subject[]
    }>({ query })

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.subjects ?? []
    }
  }

  async updateSubject (actorId: string, subjectId: string, args: UpdateSubjectArgs) {
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
    const condition1 = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 1) and eq(len(y), 0) and eq(len(d), 1))'
    // 操作者是 subject 创建者
    const condition2 = '@if( eq(len(v), 1) and eq(len(u), 1) and eq(len(x), 0) and eq(len(y), 1) and eq(len(d), 1))'

    const mutation = {
      uid: subjectId,
      'dgraph.type': 'Subject'
    }

    Object.assign(mutation, args)

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{uid: string}>
      y: Array<{uid: string}>
      d: Array<{uid: string}>
      subject: Subject[]
    }>({
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
      throw new ForbiddenException(`操作者 ${actorId} 既不是 ${subjectId} 的创建者也不是管理员`)
    }

    Object.assign(res.json.subject[0], args)

    return res.json.subject[0]
  }

  /**
   * 创建一个新的主题
   * @param id 创建 Subject 的 User 的 id
   * @param param1 相关参数
   * @returns Promise<Subject>
   */
  async createSubject (id: string, { universityId, ...args }: CreateSubjectArgs): Promise<Subject> {
    const query = `
      query v($id: string, $universityId: string) {
        q(func: uid($id)) @filter(type(User)) { q as uid }
        u(func: uid($universityId)) @filter(type(University)) { u as uid }
      }
    `
    const condition = '@if( eq(len(q), 1) and eq(len(u), 1) )'
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

    const addToUniversityCond = '@if( eq(len(q), 1) and eq(len(u), 1) )'
    const addToUniversityMut = {
      uid: 'uid(u)',
      subjects: {
        uid: '_:subject'
      }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      q: Array<{uid: string}>
      u: Array<{uid: string}>
    }>({
      query,
      mutations: [
        { mutation, condition },
        { mutation: addToUniversityMut, condition: addToUniversityCond }
      ],
      vars: { $id: id, $universityId: universityId }
    })

    if (res.json.q.length !== 1) {
      throw new UserNotFoundException(id)
    }
    if (res.json.u.length !== 1) {
      throw new UniversityNotFoundException(universityId)
    }

    const _id = res.uids.get('subject')
    if (!_id) throw new SystemErrorException()

    return {
      id: _id,
      createdAt: now(),
      ...args
    }
  }

  async getCreatorOfSubject (id: SubjectId) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query v($uid: string) {
          subject(func: uid($uid)) @filter(type(Subject)) {
            creator @filter(type(User)) {
              id: uid
              expand(_all_)
            }
          }
        }
      `
      const res = await this.dgraph
        .newTxn({ readOnly: true })
        .queryWithVars(query, { $uid: id })
      const user = res.getJson().subject[0].creator as unknown as User
      if (!user) {
        throw new ForbiddenException('user不存在')
      }

      return user
    } finally {
      await txn.discard()
    }
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

  async findPostsBySubjectId (id: string, first: number, offset: number): Promise<PostsConnection> {
    const query = `
        query v($uid: string) {
          var(func: uid($uid)) {
            posts as posts @filter(not has(delete))
          }
          totalCount(func: uid(posts)) {count(uid)}
          posts(func: uid(posts), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
            id: uid
            expand(_all_)
          }
        }
      `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      posts: Post[]
    }>({ query, vars: { $uid: id } })

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.posts ?? []
    }
  }
}
