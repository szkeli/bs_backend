import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient, Mutation, Request } from 'dgraph-js'

import { Comment } from '../comment/models/comment.model'
import { Conversation, CONVERSATION_STATE } from '../conversations/models/conversations.model'
import { DbService } from '../db/db.service'
import { Post } from '../posts/models/post.model'
import { User } from '../user/models/user.model'
import { Report, REPORT_STATE, REPORT_TYPE, Report2Union, ReportsConnection } from './models/reports.model'

@Injectable()
export class ReportsService {
  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
  }

  async findReportsByCommentId (id: string, first: number, offset: number): Promise<ReportsConnection> {
    const query = `
      query v($commentId: string) {
        totalCount(func: uid($commentId)) @filter(type(Comment)) {
          count: count(reports)
        }
        comment(func: uid($commentId)) @filter(type(Comment)) {
          reports (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Report)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $commentId: id }))
      .getJson() as unknown as {
      totalCount: Array<{ count: number}>
      comment: Array<{reports: Report[]}>
    }
    return {
      nodes: res.comment[0]?.reports || [],
      totalCount: res.totalCount[0].count
    }
  }

  async findReportsByPostId (id: string, first: number, offset: number): Promise<ReportsConnection> {
    const query = `
      query v($postId: string) {
        totalCount(func: uid($postId)) @filter(type(Post)) {
          count: count(reports)
        }
        post(func: uid($postId)) @filter(type(Post)) {
          reports (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Report)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $postId: id }))
      .getJson() as unknown as {
      totalCount: Array<{ count: number}>
      post: Array<{reports: Report[]}>
    }
    return {
      nodes: res.post[0]?.reports || [],
      totalCount: res.totalCount[0].count
    }
  }

  async findCreatorOfReport (id: string) {
    const query = `
      query v($reportId: string) {
        report(func: uid($reportId)) @filter(type(Report)) {
          creator @filter(type(User)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $reportId: id }))
      .getJson() as unknown as {
      report: Array<{creator: User}>
    }

    return res.report[0]?.creator
  }

  async findReportsByUid (id: string, first: number, offset: number): Promise<ReportsConnection> {
    const query = `
      query v($uid: string) {
        totalCount(func: uid($uid)) {
          count: count(reports)
        }
        user(func: uid($uid)){
          reports (orderdesc: createdAt, first: ${first}, offset: ${offset})  {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $uid: id }))
      .getJson() as unknown as {
      totalCount: Array<{count: number}>
      user: Array<{reports: Report[]}>
    }
    return {
      nodes: res.user[0]?.reports || [],
      totalCount: res.totalCount[0].count
    }
  }

  /**
   * 通过举报id获取举报所属的会话
   * @param id 举报id
   * @returns { Promise<Conversation }
   */
  async findConversationByReportId (id: string): Promise<Conversation> {
    const query = `
      query v($uid: string) {
        report(func: uid($uid)) @filter(type(Report)) {
          conversation @filter(type(Conversation)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $uid: id }))
      .getJson() as unknown as {
      report: Array<{conversation: Conversation}>
    }
    return res.report[0]?.conversation
  }

  /**
   * 通过举报的id获取被举报的对象
   * @param {string} id 举报的id
   * @returns { Promise<User|Post|Comment> }
   */
  async findReport2ByReportId (id: string): Promise<User|Post|Comment> {
    const query = `
      query v($uid: string) {
        report(func: uid($uid)) @filter(type(Report)) {
          to {
            id: uid
            expand(_all_)
            dgraph.type
          }
        }
      }
    `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $uid: id }))
      .getJson() as unknown as {
      report: Array<{to: (typeof Report2Union) & { 'dgraph.type': [string]}}>
    }

    if (res.report[0].to['dgraph.type'].includes('User')) {
      return new User(res.report[0].to as unknown as User)
    }
    if (res.report[0].to['dgraph.type'].includes('Post')) {
      return new Post(res.report[0].to as unknown as Post)
    }
    if (res.report[0].to['dgraph.type'].includes('Comment')) {
      return new Comment(res.report[0].to as unknown as Comment)
    }
  }

  /**
   * 举报一个用户
   * @param id 举报者id
   * @param uid 被举报者id
   * @param {REPORT_TYPE} type 举报类型
   * @param description 举报描述
   */
  async addReportOnUser (id: string, uid: string, type: REPORT_TYPE, description: string) {
    if (id === uid) {
      throw new ForbiddenException('不能举报自己')
    }
    const txn = this.dgraph.newTxn()
    try {
      const now = new Date().toISOString()
      const conditions = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) )'
      const query = `
        query v($reporter: string, $uid: string) {
          # 举报者是否存在
          v(func: uid($reporter)) @filter(type(User)) { v as uid }
          # 被举报者是否存在
          u(func: uid($uid)) @filter(type(User)) { u as uid }
          # 一次对一个用户在一个时间只能举报一次
          x(func: uid($reporter)) @filter(type(User)) {
            conversations {
              messages @filter(type(Report) AND uid_in(to, $uid)) {
                x as uid
              }
            }
          }
        }
      `
      const mutation = {
        uid: '_:report',
        'dgraph.type': 'Report',
        type,
        description,
        createdAt: now,
        to: {
          uid,
          reports: {
            uid: '_:report'
          }
        },
        creator: {
          uid: id
        },
        state: REPORT_STATE.OPEN,
        participants: {
          uid: id
        },
        conversation: {
          uid: '_:conversation',
          'dgraph.type': 'Conversation',
          state: CONVERSATION_STATE.RUNNING,
          createdAt: now,
          creator: {
            uid: id,
            conversations: {
              uid: '_:conversation'
            }
          },
          messages: {
            uid: '_:report'
          },
          description: `举报会话：用户 ${id} 举报用户 ${uid}`,
          title: `用户 ${id} 的举报`
        }
      }

      const mu = new Mutation()
      mu.setSetJson(mutation)
      mu.setCond(conditions)

      const req = new Request()
      const vars = req.getVarsMap()
      vars.set('$reporter', id)
      vars.set('$uid', uid)
      req.setQuery(query)
      req.addMutations(mu)
      req.setCommitNow(true)

      const res = await txn.doRequest(req)
      const json = res.getJson() as unknown as {
        v: Array<{uid: string}>
        u: Array<{uid: string}>
        x: Array<{conversations: any[]}>
      }
      if (!json.v || json.v.length !== 1) {
        throw new ForbiddenException(`举报者 ${id} 不存在`)
      }
      if (!json.u || json.u.length !== 1) {
        throw new ForbiddenException(`被举报者 ${uid} 不存在`)
      }
      if (!json.x || json.x.length !== 0) {
        throw new ForbiddenException(`用户 ${id} 对 用户 ${uid} 的举报已经提交，待处理中`)
      }
      const reportId = res.getUidsMap().get('report')
      const u: Report = {
        id: reportId,
        createdAt: now,
        type,
        description,
        state: REPORT_STATE.OPEN
      }
      return u
    } finally {
      await txn.discard()
    }
  }

  /**
   * 举报一个帖子
   * @param id 举报者id
   * @param postId 被举报的帖子的id
   * @param type 举报的类型
   * @param description 举报的描述
   * @returns {Promise<Report>}
   */
  async addReportOnPost (id: string, postId: string, type: REPORT_TYPE, description: string): Promise<Report> {
    const txn = this.dgraph.newTxn()
    try {
      const now = new Date().toISOString()
      const conditions = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) )'
      const query = `
        query v($reporter: string, $uid: string) {
          # 举报者是否存在
          v(func: uid($reporter)) @filter(type(User)) { v as uid }
          # 被举报的帖子是否存在
          u(func: uid($uid)) @filter(type(Post)) { u as uid }
          # 一次对一个帖子在一个时间只能举报一次
          x(func: uid($reporter)) @filter(type(User)) {
            conversations {
              messages @filter(type(Report) AND uid_in(to, $uid)) {
                x as uid
              }
            }
          }
        }
      `
      const mutation = {
        uid: '_:report',
        'dgraph.type': 'Report',
        type,
        description,
        createdAt: now,
        to: {
          uid: postId,
          reports: {
            uid: '_:report'
          }
        },
        creator: {
          uid: id
        },
        state: REPORT_STATE.OPEN,
        participants: {
          uid: id
        },
        conversation: {
          uid: '_:conversation',
          'dgraph.type': 'Conversation',
          state: CONVERSATION_STATE.RUNNING,
          createdAt: now,
          creator: {
            uid: id,
            conversations: {
              uid: '_:conversation'
            }
          },
          messages: {
            uid: '_:report'
          },
          description: `举报会话：用户 ${id} 举报帖子 ${postId}`,
          title: `用户 ${id} 的举报`
        }
      }

      const mu = new Mutation()
      mu.setSetJson(mutation)
      mu.setCond(conditions)

      const req = new Request()
      const vars = req.getVarsMap()
      vars.set('$reporter', id)
      vars.set('$uid', postId)
      req.setQuery(query)
      req.addMutations(mu)
      req.setCommitNow(true)

      const res = await txn.doRequest(req)
      const json = res.getJson() as unknown as {
        v: Array<{uid: string}>
        u: Array<{uid: string}>
        x: Array<{conversations: any[]}>
      }
      if (!json.v || json.v.length !== 1) {
        throw new ForbiddenException(`举报者 ${id} 不存在`)
      }
      if (!json.u || json.u.length !== 1) {
        throw new ForbiddenException(`被举报的帖子 ${postId} 不存在`)
      }
      if (!json.x || json.x.length !== 0) {
        throw new ForbiddenException(`用户 ${id} 对帖子 ${postId} 的举报已经提交，待处理中`)
      }
      const reportId = res.getUidsMap().get('report')
      const u: Report = {
        id: reportId,
        createdAt: now,
        type,
        description,
        state: REPORT_STATE.OPEN
      }
      return u
    } finally {
      await txn.discard()
    }
  }

  async addReportOnComment (id: string, commentId: string, type: REPORT_TYPE, description: string) {
    const txn = this.dgraph.newTxn()
    try {
      const now = new Date().toISOString()
      const conditions = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) )'
      const query = `
        query v($reporter: string, $uid: string) {
          # 举报者是否存在
          v(func: uid($reporter)) @filter(type(User)) { v as uid }
          # 被举报的评论是否存在
          u(func: uid($uid)) @filter(type(Comment)) { u as uid }
          # 一次对一个评论在一个时间只能举报一次
          x(func: uid($reporter)) @filter(type(User)) {
            conversations {
              messages @filter(type(Report) AND uid_in(to, $uid)) {
                x as uid
              }
            }
          }
        }
      `
      const mutation = {
        uid: '_:report',
        'dgraph.type': 'Report',
        type,
        description,
        createdAt: now,
        to: {
          uid: commentId,
          reports: {
            uid: '_:report'
          }
        },
        creator: {
          uid: id
        },
        state: REPORT_STATE.OPEN,
        participants: {
          uid: id
        },
        conversation: {
          uid: '_:conversation',
          'dgraph.type': 'Conversation',
          state: CONVERSATION_STATE.RUNNING,
          createdAt: now,
          creator: {
            uid: id,
            conversations: {
              uid: '_:conversation'
            }
          },
          messages: {
            uid: '_:report'
          },
          description: `举报会话：用户 ${id} 举报帖子 ${commentId}`,
          title: `用户 ${id} 的举报`
        }
      }

      const mu = new Mutation()
      mu.setSetJson(mutation)
      mu.setCond(conditions)

      const req = new Request()
      const vars = req.getVarsMap()
      vars.set('$reporter', id)
      vars.set('$uid', commentId)
      req.setQuery(query)
      req.addMutations(mu)
      req.setCommitNow(true)

      const res = await txn.doRequest(req)
      const json = res.getJson() as unknown as {
        v: Array<{uid: string}>
        u: Array<{uid: string}>
        x: Array<{conversations: any[]}>
      }
      if (!json.v || json.v.length !== 1) {
        throw new ForbiddenException(`举报者 ${id} 不存在`)
      }
      if (!json.u || json.u.length !== 1) {
        throw new ForbiddenException(`被举报的评论 ${commentId} 不存在`)
      }
      if (!json.x || json.x.length !== 0) {
        throw new ForbiddenException(`用户 ${id} 对评论 ${commentId} 的举报已经提交，待处理中`)
      }
      const reportId = res.getUidsMap().get('report')
      const u: Report = {
        id: reportId,
        createdAt: now,
        type,
        description,
        state: REPORT_STATE.OPEN
      }
      return u
    } finally {
      await txn.discard()
    }
  }
}
