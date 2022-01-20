import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient } from 'dgraph-js'

import { MESSAGE_TYPE } from 'src/messages/models/messages.model'

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

  async report (id: string) {
    const query = `
      query v($reportId: string) {
        report(func: uid($reportId)) @filter(type(Report)) {
          id: uid
          expand(_all_)
        }
      }
    `
    // {
    //   report: [
    //     {
    //       id: '0xed1c',
    //       state: 'CLOSE',
    //       type: 'LEWD_HARASS',
    //       description: '涉黄评论2',
    //       createdAt: '2022-01-19T21:33:43.978Z'
    //     }
    //   ]
    // }
    const res = await this.dbService.commitQuery<{report: Report[]}>({ query, vars: { $reportId: id } })
    return res.report[0]
  }

  async discardReport (id: string, reportId: string, content: string) {
    const query = `
      query v($adminId: string, $reportId: string, $reportState: string) {
        v(func: uid($adminId)) @filter(type(Admin)) { v as uid }
        u(func: uid($reportId)) @filter(type(Report)) { u as uid }
        x(func: uid($reportId)) @filter(type(Report) AND eq(state, $reportState)) { x as uid }
        q(func: uid($reportId)) @filter(type(Report)) {
          # 举报所在的会话id
          conversation as conversation
        }
      }
    `
    const now = new Date().toISOString()
    const conditions = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 1) )'
    const mutation = {
      uid: reportId,
      // 关闭该举报
      state: REPORT_STATE.CLOSE,
      conversation: {
        uid: 'uid(conversation)',
        // 关闭举报所在的会话
        state: CONVERSATION_STATE.CLOSE,
        messages: [
          {
            // 创建一条新消息
            uid: '_:message',
            'dgraph.type': 'Message',
            type: MESSAGE_TYPE.TEXT,
            content,
            createdAt: now,
            creator: {
              uid: id
            },
            conversation: {
              uid: 'uid(conversation)'
            }
          }, {
            uid: '_:sys_message',
            'dgraph.type': 'Message',
            type: MESSAGE_TYPE.TEXT,
            content: '举报已处理完成，系统自动关闭会话',
            createdAt: new Date().toISOString(),
            creator: {
              uid: id
            },
            conversation: {
              uid: 'uid(conversation)'
            }
          }
        ]
      }
    }
    const res = await this.dbService.commitConditionalUpsertWithVars<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{uid: string}>
    }>({
      conditions,
      mutation,
      query,
      vars: {
        $reportId: reportId,
        $reportState: REPORT_STATE.OPEN,
        $adminId: id
      }
    })
    if (res.json.x.length !== 1) {
      throw new ForbiddenException(`举报 ${reportId} 已被关闭`)
    }
    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`管理员 ${id} 不存在`)
    }
    if (res.json.u.length !== 1) {
      throw new ForbiddenException(`举报 ${reportId} 不存在`)
    }
    console.error(res)
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
    console.error(res)
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
  async addReportOnUser (id: string, uid: string, type: REPORT_TYPE, description: string): Promise<Report> {
    if (id === uid) {
      throw new ForbiddenException('不能举报自己')
    }
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
      // 创建一个举报
      uid: '_:report',
      'dgraph.type': 'Report',
      type,
      description,
      createdAt: now,
      state: REPORT_STATE.OPEN,
      to: {
        uid,
        reports: {
          uid: '_:report'
        }
      },
      creator: {
        uid: id
      },
      conversation: {
        // 创建一个会话
        uid: '_:conversation',
        'dgraph.type': 'Conversation',
        state: CONVERSATION_STATE.RUNNING,
        createdAt: now,
        participants: {
          uid: id
        },
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
    const res = await this.dbService.commitConditionalUpsertWithVars<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{conversations: any[]}>
    }>({
      query,
      conditions,
      mutation,
      vars: {
        $reporter: id,
        $uid: uid
      }
    })
    if (!res.json.v || res.json.v.length !== 1) {
      throw new ForbiddenException(`举报者 ${id} 不存在`)
    }
    if (!res.json.u || res.json.u.length !== 1) {
      throw new ForbiddenException(`被举报者 ${uid} 不存在`)
    }
    if (!res.json.x || res.json.x.length !== 0) {
      throw new ForbiddenException(`用户 ${id} 对 用户 ${uid} 的举报已经提交，待处理中`)
    }
    return {
      id: res.uids.get('report'),
      createdAt: now,
      type,
      description,
      state: REPORT_STATE.OPEN
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
    const now = new Date().toISOString()
    const conditions = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) )'
    const query = `
      query v($reporter: string, $uid: string, $reportState: string) {
        # 举报者是否存在
        v(func: uid($reporter)) @filter(type(User)) { v as uid }
        # 被举报的帖子是否存在
        u(func: uid($uid)) @filter(type(Post)) { u as uid }
        # 一次对一个帖子在一个时间只能举报一次
        x(func: uid($reporter)) @filter(type(User)) {
          conversations {
            messages @filter(type(Report) AND uid_in(to, $uid) AND eq(state, $reportState)) {
              x as uid
            }
          }
        }
      }
    `
    const mutation = {
      // 创建新举报
      uid: '_:report',
      'dgraph.type': 'Report',
      type,
      description,
      createdAt: now,
      state: REPORT_STATE.OPEN,
      to: {
        uid: postId,
        reports: {
          uid: '_:report'
        }
      },
      creator: {
        uid: id
      },
      conversation: {
        // 创建新会话
        uid: '_:conversation',
        'dgraph.type': 'Conversation',
        state: CONVERSATION_STATE.RUNNING,
        createdAt: now,
        participants: {
          uid: id
        },
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
    const res = await this.dbService.commitConditionalUpsertWithVars<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{conversations: any[]}>
    }>({
      conditions,
      mutation,
      query,
      vars: {
        $reporter: id,
        $uid: postId,
        $reportState: REPORT_STATE.OPEN
      }
    })

    if (!res.json.v || res.json.v.length !== 1) {
      throw new ForbiddenException(`举报者 ${id} 不存在`)
    }
    if (!res.json.u || res.json.u.length !== 1) {
      throw new ForbiddenException(`被举报的帖子 ${postId} 不存在`)
    }
    if (!res.json.x || res.json.x.length !== 0) {
      throw new ForbiddenException(`用户 ${id} 对帖子 ${postId} 的举报已经提交，待处理中`)
    }
    return {
      id: res.uids.get('report'),
      createdAt: now,
      type,
      description,
      state: REPORT_STATE.OPEN
    }
  }

  async addReportOnComment (id: string, commentId: string, type: REPORT_TYPE, description: string): Promise<Report> {
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
      // 创建新举报
      uid: '_:report',
      'dgraph.type': 'Report',
      type,
      description,
      createdAt: now,
      state: REPORT_STATE.OPEN,
      to: {
        uid: commentId,
        reports: {
          uid: '_:report'
        }
      },
      creator: {
        uid: id
      },
      conversation: {
        // 创建新会话
        uid: '_:conversation',
        'dgraph.type': 'Conversation',
        state: CONVERSATION_STATE.RUNNING,
        createdAt: now,
        participants: {
          uid: id
        },
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

    const res = await this.dbService.commitConditionalUpsertWithVars<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
      x: Array<{conversations: any[]}>
    }>({
      query,
      conditions,
      mutation,
      vars: {
        $reporter: id,
        $uid: commentId
      }
    })
    if (!res.json.v || res.json.v.length !== 1) {
      throw new ForbiddenException(`举报者 ${id} 不存在`)
    }
    if (!res.json.u || res.json.u.length !== 1) {
      throw new ForbiddenException(`被举报的评论 ${commentId} 不存在`)
    }
    if (!res.json.x || res.json.x.length !== 0) {
      throw new ForbiddenException(`用户 ${id} 对评论 ${commentId} 的举报已经提交，待处理中`)
    }
    return {
      id: res.uids.get('report'),
      createdAt: now,
      type,
      description,
      state: REPORT_STATE.OPEN
    }
  }
}
