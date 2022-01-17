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

  async searchComment (q: string, first: number, offset: number) {
    const query = `
        query v($query: string) {
          totalCount(func: type(Comment)) @filter(alloftext(content, $query)) {
            count(uid)
          }
          search(func: type(Comment), first: ${first}, offset: ${offset}) @filter(alloftext(content, $query)) {
            id: uid
            expand(_all_)
          }
        }
      `
    const res = await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $query: q })

    const result = res.getJson() as unknown as { search: [Comment], totalCount: Array<{count: number}>}
    const v = []
    result.search.forEach(comment => {
      v.push(new Comment(comment))
    })
    const u: SearchResultItemConnection = {
      nodes: v,
      totalCount: result.totalCount[0].count
    }
    return u
  }

  async searchUser (q: string, first: number, offset: number) {
    const query = `
        query v($query: string) {
          totalCount(func: type(User)) @filter(alloftext(name, $query) OR alloftext(userId, $query)) {
            count(uid)
          }
          search(func: type(User), first: ${first}, offset: ${offset}) @filter(alloftext(name, $query) OR alloftext(userId, $query)) {
            id: uid
            expand(_all_)
          }
        }
      `
    const res = await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $query: q })

    const result = res.getJson() as unknown as { search: [User], totalCount: Array<{count: number}>}
    const v = []
    result.search.forEach(user => {
      v.push(new User(user))
    })
    const u: SearchResultItemConnection = {
      nodes: v,
      totalCount: result.totalCount[0].count
    }
    return u
  }

  async searchPost (q: string, first: number, offset: number) {
    const query = `
    query v($query: string) {
      totalCount(func: type(Post)) @filter(alloftext(title, $query) OR alloftext(content, $query)) {
        count(uid)
      }
      search(func: type(Post), first: ${first}, offset: ${offset}) @filter(alloftext(title, $query) OR alloftext(content, $query)) {
        id: uid
        expand(_all_)
      }
    }
  `
    const res = await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $query: q })

    const result = res.getJson() as unknown as { search: [Post], totalCount: Array<{count: number}> }

    const v = []
    result.search.forEach(post => {
      v.push(new Post(post))
    })
    const u: SearchResultItemConnection = {
      nodes: v,
      totalCount: result.totalCount[0].count
    }
    return u
  }
}
