import { Injectable } from '@nestjs/common'
import { DgraphClient } from 'dgraph-js'

import { DbService } from 'src/db/db.service'

import { Comment } from '../comment/models/comment.model'
import { Post } from '../posts/models/post.model'
import { Subject } from '../subject/model/subject.model'
import { User } from '../user/models/user.model'
import { SearchResultItemConnection } from './model/search.model'

@Injectable()
export class SearchService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async searchSubject (q: string, first: number, offset: number) {
    const query = `
        query v($query: string) {
          totalCount(func: type(Subject)) @filter(alloftext(title, $query) OR alloftext(description, $query)) {
            count(uid)
          }
          search(func: type(Subject), first: ${first}, offset: ${offset}) @filter(alloftext(title, $query) OR alloftext(description, $query)) {
            id: uid
            expand(_all_)
          }
        }
      `
    const res = await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $query: q })

    const result = res.getJson() as unknown as { search: [Subject], totalCount: Array<{count: number}>}
    const v = []
    result.search.forEach(subject => {
      v.push(new Subject(subject))
    })
    const u: SearchResultItemConnection = {
      nodes: v,
      totalCount: result.totalCount[0].count
    }
    return u
  }

  async searchComment (q: string, first: number, offset: number): Promise<SearchResultItemConnection> {
    const query = `
        query v($query: string) {
          comments as var(func: type(Comment)) @filter(alloftext(content, $query) and not has(delete))
          totalCount(func: uid(comments)) {
            count(uid)
          }
          search(func: uid(comments), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
            id: uid
            expand(_all_)
          }
        }
      `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      search: Comment[]
    }>({ query, vars: { $query: q } })

    const comments = res.search?.map(c => new Comment(c))

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: comments
    }
  }

  async searchUser (q: string, first: number, offset: number): Promise<SearchResultItemConnection> {
    const query = `
        query v($query: string) {
          var(func: type(User)) @filter(alloftext(name, $query) or alloftext(userId, $query)) {
            q1 as uid
          }
          var(func: uid(q1)) @filter(not has(block)) {
            users as uid
          }
          totalCount(func: uid(users)) {
            count(uid)
          }
          search(func: uid(users), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
            id: uid
            expand(_all_)
          }
        }
      `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      search: User[]
    }>({ query, vars: { $query: q } })

    const users = res.search?.map(u => new User(u))

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: users
    }
  }

  async searchPost (q: string, first: number, offset: number): Promise<SearchResultItemConnection> {
    const query = `
    query v($query: string) {
      var(func: type(Post)) @filter(alloftext(content, $query) and not has(delete)) {
        posts as uid
      }
      totalCount(func: uid(posts)) {
        count(uid)
      }
      search(func: uid(posts), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
        id: uid
        expand(_all_)
      }
    }
  `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      search: Post[]
    }>({ query, vars: { $query: q } })
    const posts = res.search?.map(p => new Post(p))

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: posts
    }
  }
}
