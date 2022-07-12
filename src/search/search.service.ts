import { Injectable } from '@nestjs/common'

import { DbService } from 'src/db/db.service'

import { SystemErrorException } from '../app.exception'
import { Comment } from '../comment/models/comment.model'
import { ORDER_BY } from '../connections/models/connections.model'
import { Institute } from '../institutes/models/institutes.model'
import { Post, RelayPagingConfigArgs } from '../posts/models/post.model'
import { SubCampus } from '../subcampus/models/subcampus.model'
import { Subject } from '../subject/model/subject.model'
import { handleRelayForwardAfter, relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { University } from '../universities/models/universities.models'
import { User } from '../user/models/user.model'
import { SearchArgs, SearchResultItemConnection, SEARCHTYPE } from './model/search.model'

@Injectable()
export class SearchService {
  constructor (private readonly dbService: DbService) {}

  async search (searchArgs: SearchArgs, pagingArgs: RelayPagingConfigArgs): Promise<SearchResultItemConnection> {
    const { type, query } = searchArgs
    let { after, orderBy, first } = pagingArgs

    after = handleRelayForwardAfter(after)
    if (type === SEARCHTYPE.POST && first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.searchPost(query, first, after)
    }
    if (type === SEARCHTYPE.USER && first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.searchUser(query, first, after)
    }
    if (type === SEARCHTYPE.COMMENT && first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.searchComment(query, first, after)
    }
    if (type === SEARCHTYPE.SUBJECT && first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.searchSubject(query, first, after)
    }
    if (type === SEARCHTYPE.UNIVERSITY && first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.searchUniversity(query, first, after)
    }
    if (type === SEARCHTYPE.INSTITUTE && first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.searchInstitute(query, first, after)
    }
    if (type === SEARCHTYPE.SUBCAMPUS && first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.searchSubCampus(query, first, after)
    }
    throw new SystemErrorException()
  }

  async searchSubCampus (q: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(subCampuses), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($query: string, $after: string) {
        var(func: type(SubCampus), orderdesc: createdAt) @filter(alloftext(name, $query) and not has(delete)) {
          subCampuses as uid
        }
        totalCount(func: uid(subCampuses)) { count(uid) }
        ${after ? q1 : ''}
        objs(func: uid(${after ? 'q' : 'subCampuses'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          dgraph.type
          expand(_all_)
        }
        startO(func: uid(subCampuses), first: -1) { createdAt }
        endO(func: uid(subCampuses), first: 1) { createdAt }
      } 
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<SubCampus>>({
      query,
      vars: { $query: q, $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async searchInstitute (q: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(institutes), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($query: string, $after: string) {
        var(func: type(Institute), orderdesc: createdAt) @filter(alloftext(name, $query) and not has(delete)) {
          institutes as uid
        }
        totalCount(func: uid(institutes)) { count(uid) }
        ${after ? q1 : ''}
        objs(func: uid(${after ? 'q' : 'institutes'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          dgraph.type
          expand(_all_)
        }
        startO(func: uid(institutes), first: -1) { createdAt }
        endO(func: uid(institutes), first: 1) { createdAt }
      } 
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Institute>>({
      query,
      vars: { $query: q, $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async searchUniversity (q: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(universities), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($query: string, $after: string) {
        var(func: type(University), orderdesc: createdAt) @filter(alloftext(name, $query) and not has(delete)) {
          universities as uid
        }
        totalCount(func: uid(universities)) { count(uid) }
        ${after ? q1 : ''}
        objs(func: uid(${after ? 'q' : 'universities'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          dgraph.type
          expand(_all_)
        }
        startO(func: uid(universities), first: -1) { createdAt }
        endO(func: uid(universities), first: 1) { createdAt }
      } 
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<University>>({
      query,
      vars: { $query: q, $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async searchSubject (q: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(subjects), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($query: string, $after: string) {
          subjects as var(func: type(Subject), orderdesc: createdAt) @filter((alloftext(title, $query) or alloftext(description, $query)) and not has(delete))
          totalCount(func: uid(subjects)) {
            count(uid)
          }
          ${after ? q1 : ''}
          results(func: uid(${after ? 'q' : 'subjects'}), orderdesc: createdAt, first: ${first}) {
            id: uid
            expand(_all_)
            dgraph.type
          }
          # 开始游标 
          startSubject(func: uid(subjects), first: -1) {
            createdAt
          }
          # 结束游标
          endSubject(func: uid(subjects), first: 1) {
            createdAt
          }
        }
      `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      results: Subject[]
      startSubject: Array<{createdAt: string}>
      endSubject: Array<{createdAt: string}>
    }>({ query, vars: { $query: q, $after: after } })

    return relayfyArrayForward({
      totalCount: res.totalCount,
      startO: res.startSubject,
      endO: res.endSubject,
      objs: res.results,
      first,
      after
    })
  }

  async searchComment (q: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(comments), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($query: string, $after: string) {
          comments as var(func: type(Comment), orderdesc: createdAt) @filter(alloftext(content, $query) and not has(delete))
          
          totalCount(func: uid(comments)) {
            count(uid)
          }
          ${after ? q1 : ''}
          search(func: uid(${after ? 'q' : 'comments'}), orderdesc: createdAt, first: ${first}) {
            id: uid
            expand(_all_)
            dgraph.type
          }
          # 开始游标
          startComment(func: uid(comments), first: -1) {
            createdAt
          }
          # 结束游标
          endComment(func: uid(comments), first: 1) {
            createdAt
          }
        }
      `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      results: Comment[]
      startComment: Array<{createdAt: string}>
      endComment: Array<{createdAt: string}>
    }>({ query, vars: { $query: q, $after: after } })

    return relayfyArrayForward({
      totalCount: res.totalCount,
      startO: res.startComment,
      endO: res.endComment,
      objs: res.results,
      first,
      after
    })
  }

  async searchUser (q: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(users), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
        query v($query: string, $after: string) {
          users as var(func: type(User), orderdesc: createdAt) @filter((alloftext(name, $query) or alloftext(userId, $query)) and not has(block)) 

          totalCount(func: uid(users)) {
            count(uid)
          }
          ${after ? q1 : ''}
          results(func: uid(${after ? 'q' : 'users'}), orderdesc: createdAt, first: ${first}) {
            id: uid
            expand(_all_)
            dgraph.type
          }

          # 开始游标
          startUser(func: uid(users), first: -1) {
            createdAt
          }
          # 结束游标
          endUser(func: uid(users), first: 1) {
            createdAt
          }
        }
      `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startUser: Array<{createdAt: string}>
      endUser: Array<{createdAt: string}>
      results: User[]
    }>({ query, vars: { $query: q, $after: after } })

    return relayfyArrayForward({
      totalCount: res.totalCount,
      startO: res.startUser,
      endO: res.endUser,
      objs: res.results,
      first,
      after
    })
  }

  async searchPost (q: string, first: number, after: string | null) {
    const q1 = 'var(func: uid(posts), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
    query v($query: string, $after: string) {
      posts as var(func: type(Post), orderdesc: createdAt) @filter(alloftext(content, $query) and not has(delete))

      totalCount(func: uid(posts)) {
        count(uid)
      }
      ${after ? q1 : ''}
      results(func: uid(${after ? 'q' : 'posts'}), orderdesc: createdAt, first: ${first}) {
        id: uid
        expand(_all_)
        dgraph.type
      }
      # 开始游标
      startPost(func: uid(posts), first: -1) {
        createdAt
      }
      # 结束游标
      endPost(func: uid(posts), first: 1) {
        createdAt
      }
    }
  `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      results: Post[]
      startPost: Array<{createdAt: string}>
      endPost: Array<{createdAt: string}>
    }>({ query, vars: { $query: q, $after: after } })

    return relayfyArrayForward({
      totalCount: res.totalCount,
      startO: res.startPost,
      endO: res.endPost,
      objs: res.results,
      first,
      after
    })
  }
}
