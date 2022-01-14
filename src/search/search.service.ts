import { Injectable } from '@nestjs/common'
import { DgraphClient } from 'dgraph-js'

import { DbService } from 'src/db/db.service'

import { Post } from '../posts/models/post.model'
import { User } from '../user/models/user.model'
import { SearchResultItemConnection } from './model/search.model'

@Injectable()
export class SearchService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async searchComment (query: string, first: number, offset: number) {
    const u: SearchResultItemConnection = {
      nodes: [{
        id: '',
        content: '',
        createdAt: ''
      }],
      userCount: 21,
      postCount: 0,
      commentCount: 0
    }
    return u
  }

  async searchUser (q: string, first: number, offset: number) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query v($query: string) {
          totalCount(func: type(User)) @filter(alloftext(name, $query) OR alloftext(userId, $query)) {
            count(uid)
          }
          search(func: type(User)) @filter(alloftext(name, $query) OR alloftext(userId, $query)) {
            id: uid
            userId
            name
            avatarImageUrl
            gender
            school
            grade
            openId
            unionId
            createdAt
            updatedAt
            lastLoginedAt
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
        userCount: result.totalCount[0].count
      }
      return u
    } finally {
      await txn.discard()
    }
  }

  async searchPost (q: string, first: number, offset: number) {
    const txn = this.dgraph.newTxn()
    try {
      const query = `
        query v($query: string) {
          totalCount(func: type(Post)) @filter(alloftext(title, $query) OR alloftext(content, $query)) {
            count(uid)
          }
          search(func: type(Post), first: ${first}, offset: ${offset}) @filter(alloftext(title, $query) OR alloftext(content, $query)) {
            id: uid
            title
            content
            images
            createdAt
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
        postCount: result.totalCount[0].count
      }
      return u
    } finally {
      await txn.discard()
    }
  }
}
