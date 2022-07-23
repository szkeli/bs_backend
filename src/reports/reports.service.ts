import { ForbiddenException, Injectable } from '@nestjs/common'

import { MESSAGE_TYPE } from 'src/messages/models/messages.model'

import { SystemErrorException } from '../app.exception'
import { ORDER_BY, RelayPagingConfigArgs } from '../connections/models/connections.model'
import { CONVERSATION_STATE } from '../conversations/models/conversations.model'
import { DbService } from '../db/db.service'
import { relayfyArrayForward, RelayfyArrayParam } from '../tool'
import { Report, REPORT_STATE, REPORT_TYPE, Report2Union, ReportsConnection } from './models/reports.model'

@Injectable()
export class ReportsService {
  constructor (private readonly dbService: DbService) {}

  async reportsWithRelay ({ first, after, orderBy }: RelayPagingConfigArgs) {
    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.reportsWithRelayForward(first, after)
    }
    throw new Error('Method not implemented.')
  }

  async reportsWithRelayForward (first: number, after: string | null) {
    const q1 = 'var(func: uid(reports), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($after: string) {
        var(func: type(Report)) {
          reports as uid
        }
        ${after ? q1 : ''}
        totalCount(func: uid(reports)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'reports'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(reports), first: -1) { createdAt }
        endO(func: uid(reports), first: 1) { createdAt }
      }
    `

    const res = await this.dbService.commitQuery<RelayfyArrayParam<Report>>({
      query,
      vars: { $after: after }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
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
    const res = await this.dbService.commitQuery<{report: Report[]}>({ query, vars: { $reportId: id } })
    return res.report[0]
  }

  async reports (first: number, offset: number): Promise<ReportsConnection> {
    const query = `
      query {
        totalCount(func: type(Report)) {
          count(uid)
        }
        reports(func: type(Report), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      reports: Report[]
    }>({ query })
    return {
      nodes: res.reports || [],
      totalCount: res.totalCount[0].count
    }
  }

  async acceptReport (id: string, reportId: string, content: string) {
    const now = new Date().toISOString()
    const query = `
      query v($adminId: string, $reportId: string, $reportState: string) {
        a(func: uid($adminId)) @filter(type(Admin)) { a as uid }
        r(func: uid($reportId)) @filter(type(Report)) { r as uid }
        # 举报未被处理
        x(func: uid($reportId)) @filter(type(Report) AND eq(state, $reportState)) { x as uid }
        q(func: uid($reportId)) @filter(type(Report)) {
          # 举报所在的会话id
          conversation as conversation
          # 被举报的对象
          to as to
        }
        # 被举报的对象是User或者Admin
        p(func: uid($reportId)) @filter(type(Report)) {
          to @filter(type(User) OR type(Admin)) {
            p as uid
          }
        }
        # 被举报的对象是Post或Comment
        v(func: uid($reportId)) @filter(type(Report)) {
          to @filter(type(Post) OR type(Comment)) {
            v as uid
          }
        }
      }
    `
    // 被举报的对象是Post或Comment
    const isPostOrComment = '@if( eq(len(a), 1) AND eq(len(r), 1) AND eq(len(x), 1) AND eq(len(p), 0) AND eq(len(v), 1) )'
    const mutation1 = {
      uid: reportId,
      // 关闭该举报
      state: REPORT_STATE.CLOSE,
      to: {
        uid: 'uid(to)',
        // 添加一个删除
        delete: {
          uid: '_:delete',
          'dgraph.type': 'Delete',
          createdAt: now,
          description: content,
          creator: {
            uid: id,
            deletes: {
              uid: '_:delete'
            }
          },
          to: {
            uid: 'uid(to)'
          }
        }
      },
      conversation: {
        uid: 'uid(conversation)',
        state: CONVERSATION_STATE.CLOSE,
        messages: [
          {
            // 创建一个新消息
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

    // 被举报的对象是User或Admin
    const isUserOrAdmin = '@if( eq(len(a), 1) AND eq(len(r), 1) AND eq(len(x), 1) AND eq(len(p), 1) AND eq(len(v), 0) )'
    const mutation2 = {
      uid: reportId,
      // 关闭该举报
      state: REPORT_STATE.CLOSE,
      to: {
        uid: 'uid(to)',
        // 添加一个拉黑
        block: {
          uid: '_:block',
          'dgraph.type': 'Block',
          createdAt: now,
          description: content,
          creator: {
            uid: id,
            blocks: {
              uid: '_:block'
            }
          },
          to: {
            uid: 'uid(to)'
          }
        }
      },
      conversation: {
        uid: 'uid(conversation)',
        state: CONVERSATION_STATE.CLOSE,
        messages: [
          {
            // 创建一个新消息
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

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      a: Array<{uid: string}>
      r: Array<{uid: string}>
      x: Array<{uid: string}>
      q: Array<{}>
      p: Array<{uid: string}>
      v: Array<{}>
    }>({
      mutations: [
        { mutation: mutation1, condition: isPostOrComment },
        { mutation: mutation2, condition: isUserOrAdmin }
      ],
      query: query,
      vars: {
        $adminId: id,
        $reportId: reportId,
        $reportState: REPORT_STATE.OPEN
      }
    })

    if (res.json.x.length !== 1) {
      throw new ForbiddenException(`举报 ${reportId} 的对象不存在`)
    }

    if (res.json.a.length !== 1) {
      throw new ForbiddenException(`管理员 ${id} 不存在`)
    }
    if (res.json.r.length !== 1) {
      throw new ForbiddenException(`举报 ${reportId} 不存在`)
    }

    if (res.uids.get('message')) {
      return true
    }
  }

  /**
   * 丢弃一个举报 认为一个举报无效
   * @param id 管理员id
   * @param reportId 举报id
   * @param content 为什么认为举报无效
   * @returns {Promise<boolean>}
   */
  async discardReport (id: string, reportId: string, content: string): Promise<boolean> {
    const query = `
      query v($adminId: string, $reportId: string, $reportState: string) {
        # 管理员存在
        v(func: uid($adminId)) @filter(type(Admin)) { v as uid }
        # 该举报存在
        u(func: uid($reportId)) @filter(type(Report)) { u as uid }
        # 举报未被处理
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
    return !!res.uids.get('message')
  }

  // async findReportsByCommentId (id: string, first: number, offset: number): Promise<ReportsConnection> {
  //   const query = `
  //     query v($commentId: string) {
  //       totalCount(func: uid($commentId)) @filter(type(Comment)) {
  //         count: count(reports)
  //       }
  //       comment(func: uid($commentId)) @filter(type(Comment)) {
  //         reports (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Report)) {
  //           id: uid
  //           expand(_all_)
  //         }
  //       }
  //     }
  //   `
  //   const res = (await this.dgraph
  //     .newTxn({ readOnly: true })
  //     .queryWithVars(query, { $commentId: id }))
  //     .getJson() as unknown as {
  //     totalCount: Array<{ count: number}>
  //     comment: Array<{reports: Report[]}>
  //   }
  //   return {
  //     nodes: res.comment[0]?.reports || [],
  //     totalCount: res.totalCount[0].count
  //   }
  // }

  // async findReportsByPostId (id: string, first: number, offset: number): Promise<ReportsConnection> {
  //   const query = `
  //     query v($postId: string) {
  //       totalCount(func: uid($postId)) @filter(type(Post)) {
  //         count: count(reports)
  //       }
  //       post(func: uid($postId)) @filter(type(Post)) {
  //         reports (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Report)) {
  //           id: uid
  //           expand(_all_)
  //         }
  //       }
  //     }
  //   `
  //   const res = (await this.dgraph
  //     .newTxn({ readOnly: true })
  //     .queryWithVars(query, { $postId: id }))
  //     .getJson() as unknown as {
  //     totalCount: Array<{ count: number}>
  //     post: Array<{reports: Report[]}>
  //   }
  //   return {
  //     nodes: res.post[0]?.reports || [],
  //     totalCount: res.totalCount[0].count
  //   }
  // }

  // async findCreatorOfReport (id: string) {
  //   const query = `
  //     query v($reportId: string) {
  //       report(func: uid($reportId)) @filter(type(Report)) {
  //         creator @filter(type(User)) {
  //           id: uid
  //           expand(_all_)
  //         }
  //       }
  //     }
  //   `
  //   const res = (await this.dgraph
  //     .newTxn({ readOnly: true })
  //     .queryWithVars(query, { $reportId: id }))
  //     .getJson() as unknown as {
  //     report: Array<{creator: User}>
  //   }

  //   return res.report[0]?.creator
  // }

  // async findReportsByUid (id: string, first: number, offset: number): Promise<ReportsConnection> {
  //   const query = `
  //     query v($uid: string) {
  //       totalCount(func: uid($uid)) {
  //         count: count(reports)
  //       }
  //       user(func: uid($uid)){
  //         reports (orderdesc: createdAt, first: ${first}, offset: ${offset})  {
  //           id: uid
  //           expand(_all_)
  //         }
  //       }
  //     }
  //   `
  //   const res = (await this.dgraph
  //     .newTxn({ readOnly: true })
  //     .queryWithVars(query, { $uid: id }))
  //     .getJson() as unknown as {
  //     totalCount: Array<{count: number}>
  //     user: Array<{reports: Report[]}>
  //   }
  //   return {
  //     nodes: res.user[0]?.reports || [],
  //     totalCount: res.totalCount[0].count
  //   }
  // }

  /**
   * 通过举报id获取举报所属的会话
   * @param id 举报id
   * @returns { Promise<Conversation }
   */
  // async findConversationByReportId (id: string): Promise<Conversation> {
  //   const query = `
  //     query v($uid: string) {
  //       report(func: uid($uid)) @filter(type(Report)) {
  //         conversation @filter(type(Conversation)) {
  //           id: uid
  //           expand(_all_)
  //         }
  //       }
  //     }
  //   `
  //   const res = (await this.dgraph
  //     .newTxn({ readOnly: true })
  //     .queryWithVars(query, { $uid: id }))
  //     .getJson() as unknown as {
  //     report: Array<{conversation: Conversation}>
  //   }
  //   return res.report[0]?.conversation
  // }

  /**
   * 通过举报的id获取被举报的对象
   * @param {string} id 举报的id
   * @returns { Promise<User|Post|Comment> }
   */
  async to (id: string): Promise<typeof Report2Union> {
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
    const res = await this.dbService.commitQuery<{
      report: Array<{to: (typeof Report2Union)}>
    }>({ query, vars: { $uid: id } })

    return res.report[0].to
  }

  /**
   * 举报一个用户
   * @param id 举报者id
   * @param uid 被举报者id
   * @param {REPORT_TYPE} type 举报类型
   * @param description 举报描述
   * @returns {Promise<Report>}
   */
  async addReportOnUser (id: string, uid: string, type: REPORT_TYPE, description: string): Promise<Report> {
    if (id === uid) {
      throw new ForbiddenException('不能举报自己')
    }
    const now = new Date().toISOString()
    const conditions = '@if( eq(len(v), 1) AND eq(len(u), 1) AND eq(len(x), 0) and eq(len(q), 1) )'
    const query = `
      query v($reporter: string, $uid: string, $reportState: string) {
        # 举报者是否存在
        v(func: uid($reporter)) @filter(type(User)) { v as uid }
        # 被举报者是否存在
        u(func: uid($uid)) @filter(type(User)) { u as uid }
        # 被举报用户未被拉黑
        q(func: uid($uid)) @filter(type(User) and not has(block)) { q as uid }
        # 一次对一个用户在一个时间只能举报一次
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
      q: Array<{uid: string}>
    }>({
      query,
      conditions,
      mutation,
      vars: {
        $reporter: id,
        $uid: uid,
        $reportState: REPORT_STATE.OPEN
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
    if (res.json.q.length !== 1) {
      throw new ForbiddenException(`被举报用户 ${uid} 已被管理员拉黑`)
    }

    const _id = res.uids.get('report')
    if (!_id) throw new SystemErrorException()

    return {
      id: _id,
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
    const _id = res.uids.get('report')
    if (!_id) throw new SystemErrorException()
    return {
      id: _id,
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
        query v($reporter: string, $uid: string, $reportState: string) {
          # 举报者是否存在
          v(func: uid($reporter)) @filter(type(User)) { v as uid }
          # 被举报的评论是否存在
          u(func: uid($uid)) @filter(type(Comment)) { u as uid }
          # 一次对一个评论在一个时间只能举报一次
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
        $uid: commentId,
        $reportState: REPORT_STATE.OPEN
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
    const _id = res.uids.get('report')
    if (!_id) throw new SystemErrorException()

    return {
      id: _id,
      createdAt: now,
      type,
      description,
      state: REPORT_STATE.OPEN
    }
  }
}
