import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient } from 'dgraph-js'

import { DbService } from 'src/db/db.service'
import { PostId } from 'src/db/model/db.model'

import { CensorsService } from '../censors/censors.service'
import { CENSOR_SUGGESTION } from '../censors/models/censors.model'
import { Comment, CommentsConnection } from '../comment/models/comment.model'
import { Delete } from '../deletes/models/deletes.model'
import { atob, btoa, DeletePrivateValue } from '../tool'
import { User, UserWithFacets } from '../user/models/user.model'
import { Vote, VotesConnection } from '../votes/model/votes.model'
import {
  CreatePostArgs,
  Nullable,
  Post,
  PostsConnection,
  PostsConnectionWithRelay,
  PostWithCreatorId,
  RelayPagingConfigArgs
} from './models/post.model'

@Injectable()
export class PostsService {
  private readonly dgraph: DgraphClient
  constructor (
    private readonly dbService: DbService,
    private readonly censorsService: CensorsService
  ) {
    this.dgraph = dbService.getDgraphIns()
  }

  async deletedPosts (first: number, offset: number) {
    const query = `
      {
        var(func: type(Post)) @filter(has(delete)) { v as uid }
        deletedPosts(func: uid(v), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
          id: uid
          expand(_all_)
        }
        totalCount(func: uid(v)) { count(uid) }
      }
    `
    const res = await this.dbService.commitQuery<{
      deletedPosts: Delete[]
      totalCount: Array<{count: number}>
    }>({ query })

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.deletedPosts ?? []
    }
  }

  async trendingComments (id: string, first: number, offset: number): Promise<CommentsConnection> {
    const query = `
      query v($postId: string) {
        var(func: uid($postId)) @filter(type(Post)) {
          comments as comments @filter(type(Comment)) {
            c as count(comments @filter(type(Comment)))
            voteCount as count(votes @filter(type(Vote)))
            commentScore as math(c * 3)
            createdAt as createdAt

            hour as math (
              0.75 * (since(createdAt)/216000)
            )
            score as math((voteCount + commentScore) * hour)
          }
        }
        totalCount(func: uid(comments)) { count(uid) }
        comments(func: uid(comments), orderdesc: val(score), first: ${first}, offset: ${offset}) {
          val(score)
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      comments: Comment[]
    }>({ query, vars: { $postId: id } })

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.comments ?? []
    }
  }

  async findFoldedCommentsByPostId (id: string, first: number, offset: number): Promise<CommentsConnection> {
    const query = `
      query v($postId: string) {
        post(func: uid($postId)) @filter(type(Post)) {
          count: count(comments @filter(has(fold)))
          comments (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(has(fold)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{post: Array<{count: number, comments?: Comment[]}>}>({ query, vars: { $postId: id } })
    return {
      totalCount: res.post[0]?.count ?? 0,
      nodes: res.post[0]?.comments ?? []
    }
  }

  async trendingPosts (first: number, offset: number): Promise<PostsConnection> {
    if (first + offset > 30) {
      throw new ForbiddenException('first + offset 应该小于30')
    }
    // TODO
    const query = `
      query v($first: int, $offset: int) {
        posts as var(func: type(Post)) {
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
        
        totalCount(func: uid(posts)) { count(uid) }
        posts(func: uid(posts), orderdesc: val(score), first: $first, offset: $offset) {
          val(score)
          id: uid
          expand(_all_)
        } 
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: 13}>
      posts: Post[]
    }>({ query, vars: { $first: `${first}`, $offset: `${offset}` } })
    return {
      nodes: res.posts ?? [],
      totalCount: res.totalCount[0]?.count ?? 0
    }
  }

  async createPost (i: string, { content, images, subjectId, isAnonymous }: CreatePostArgs): Promise<Post> {
    const now = new Date().toISOString()
    const condition = `@if( 
      eq(len(v), 1)
      and eq(len(system), 1) 
      ${subjectId ? 'and eq(len(u), 1) ' : ''}
    )`
    const query = `
      query v($creator: string, $subjectId: string) {
        # 系统
        s(func: eq(userId, "system")) @filter(type(Admin)) { system as uid }
        # 创建者存在
        v(func: uid($creator)) @filter(type(User)) { v as uid }
        # 主题存在
        ${subjectId ? 'u(func: uid($subjectId)) @filter(type(Subject)) { u as uid }' : ''}
      }
    `

    // 审查帖子文本内容
    const textCensor = await this.censorsService.textCensor(content)

    // 帖子所属的主题
    const subject = {
      uid: subjectId,
      posts: {
        uid: '_:post'
      }
    }

    // 帖子的匿名信息
    const anonymous = {
      uid: '_:anonymous',
      'dgraph.type': 'Anonymous',
      creator: {
        uid: i
      },
      createdAt: now,
      to: {
        uid: '_:post'
      }
    }

    // 帖子的创建者
    const creator = {
      uid: i,
      posts: {
        uid: '_:post'
      }
    }

    /**
     * 含有违规内容的帖子
     * 系统自动删除
     */
    const iDelete = {
      uid: '_:delete',
      'dgraph.type': 'Delete',
      createdAt: now,
      to: {
        uid: '_:post',
        delete: {
          uid: '_:delete'
        }
      },
      creator: {
        // 代表系统自动删除
        uid: 'uid(system)',
        deletes: {
          uid: '_:delete'
        }
      }
    }

    const mutation = {
      uid: i,
      posts: {
        uid: '_:post',
        'dgraph.type': 'Post',
        content,
        createdAt: now,
        images: images ?? []
      }
    }

    // 帖子的创建者
    Object.assign(mutation.posts, { creator })

    // 发布具有主题的帖子
    if (subjectId) {
      Object.assign(mutation.posts, { subject })
    }

    // 发布匿名帖子
    if (isAnonymous) {
      Object.assign(mutation.posts, { anonymous })
    }

    // 帖子实锤含有违规文本内容
    if (textCensor.suggestion === CENSOR_SUGGESTION.BLOCK) {
      Object.assign(mutation.posts, { delete: iDelete })
    }

    // TODO 帖子疑似含有违规内容，加入人工审查
    // if (textCensor.suggestion === CENSOR_SUGGESTION.REVIEW) {}

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      s: Array<{uid: string}>
      u: Array<{uid: string}>
    }>({
      mutations: [{ mutation, condition }],
      query,
      vars: {
        $creator: i,
        $subjectId: subjectId
      }
    })

    if (res.json.s.length !== 1) {
      throw new ForbiddenException('请先注册一个名为system的管理员初始化系统')
    }

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`用户 ${i} 不存在`)
    }
    if (subjectId && res.json.u.length !== 1) {
      throw new ForbiddenException(`主题 ${subjectId} 不存在`)
    }

    return {
      id: res.uids.get('post'),
      content,
      images,
      createdAt: now
    }
  }

  async post (id: PostId): Promise<PostWithCreatorId> {
    const query = `
        query v($uid: string) {
          postCreatorId(func: uid($uid)) @filter(type(Post)) {
            creator @filter(type(User)) {
              id: uid
            }
          }
          post(func: uid($uid)) @filter(type(Post)) {
            id: uid
            expand(_all_) 
          }
        }
      `
    const res = await this.dbService.commitQuery<{
      post: Post[]
      postCreatorId: Array<{creator: {uid: string}}>
    }>({
      query,
      vars: {
        $uid: id
      }
    })

    if (!res || !res.post || res.post.length !== 1) {
      throw new ForbiddenException(`帖子 ${id} 不存在`)
    }
    return {
      ...res.post[0],
      creatorId: res.postCreatorId[0]?.creator.uid || ''
    }
  }

  async postsWithRelayForward (first: number, after: string): Promise<PostsConnectionWithRelay> {
    const query = `
      query v($after: string) {
        var(func: type(Post), orderdesc: createdAt) @filter(not has(delete)) { 
          posts as uid
        }
        var(func: uid(posts), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }
        totalCount(func: uid(posts)) {
          count: count(uid) 
        }
        posts(func: uid(q), orderdesc: createdAt, first: ${first}) {
          id: uid
          nodes as uid
          expand(_all_)
        }
        # 边界
        edge(func: uid(nodes), first: 1) {
          id: uid
          expand(_all_)  
        }
        # 开始游标
        startCursor(func: uid(posts), first: -1) {
          id: uid
          createdAt
        }
        # 结束游标
        endCursor(func: uid(posts), first: 1) {
          id: uid
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      posts: Post[]
      startCursor: Array<{id: string, createdAt: string}>
      endCursor: Array<{id: string, createdAt: string}>
      edge: Post[]
    }>({ query, vars: { $after: after } })

    const v = (res.totalCount[0]?.count ?? 0) !== 0
    const hasNextPage = res.endCursor[0]?.createdAt !== after && res.posts.length === first
    const hasPreviousPage = after !== res.startCursor[0]?.createdAt

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.posts ?? [],
      edge: {
        node: res.edge[0],
        cursor: atob(res.edge[0]?.createdAt)
      },
      pageInfo: {
        endCursor: res.endCursor[0]?.createdAt,
        startCursor: res.startCursor[0]?.createdAt,
        hasNextPage: hasNextPage && v,
        hasPreviousPage: hasPreviousPage && v
      }
    }
  }

  async postsWithRelayBackward (last: number, before: string): Promise<PostsConnectionWithRelay> {
    const query = `
    query v($before: string) {
      var(func: type(Post), orderdesc: createdAt) @filter(not has(delete)) { 
        posts as uid
      }
      var(func: uid(posts), orderdesc: createdAt) @filter(gt(createdAt, $before)) { q as uid }
      totalCount(func: uid(posts)) {
        count: count(uid) 
      }
      var(func: uid(q), orderasc: createdAt, first: ${last}) { v as uid }
      posts(func: uid(v), orderdesc: createdAt) {
        id: uid
        nodes as uid
        expand(_all_)
      }
      # 边界
      edge(func: uid(nodes), first: -1) {
        id: uid
        expand(_all_)  
      }
      # 开始游标
      startCursor(func: uid(posts), first: -1) {
        id: uid
        createdAt
      }
      # 结束游标
      endCursor(func: uid(posts), first: 1) {
        id: uid
        createdAt
      }
    }
  `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      posts: Post[]
      edge: Post[]
      startCursor: Array<{id: string, createdAt: string}>
      endCursor: Array<{id: string, createdAt: string}>
    }>({ query, vars: { $before: before } })

    const v = (res.totalCount[0]?.count ?? 0) !== 0
    const hasNextPage = res.startCursor[0]?.createdAt !== before && res.posts.length === last
    const hasPreviousPage = before !== res.endCursor[0]?.createdAt

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.posts ?? [],
      edge: {
        node: res.edge[0],
        cursor: atob(res.edge[0]?.createdAt)
      },
      pageInfo: {
        startCursor: res.startCursor[0]?.createdAt,
        endCursor: res.endCursor[0]?.createdAt,
        hasNextPage: hasNextPage && v,
        hasPreviousPage: hasPreviousPage && v
      }
    }
  }

  async postsWithRelayBackwardInit (last: number): Promise<PostsConnectionWithRelay> {
    const query = `
      query {
        var(func: type(Post), orderdesc: createdAt) @filter(not has(delete)) { 
          posts as uid
        }
        var(func: uid(posts), orderasc: createdAt, first: ${last}) { v as uid }
        totalCount(func: uid(posts)) {
          count: count(uid) 
        }
        posts(func: uid(v), orderdesc: createdAt) {
          id: uid
          nodes as uid
          expand(_all_)
        }
        # 边界
        edge(func: uid(nodes), first: -1) {
          id: uid
          expand(_all_)  
        }
        # 开始游标
        startCursor(func: uid(posts), first: -1) {
          id: uid
          createdAt
        }
        # 结束游标
        endCursor(func: uid(posts), first: 1) {
          id: uid
          createdAt
        }
      }
    `

    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      posts: Post[]
      edge: Post[]
      startCursor: Array<{id: string, createdAt: string}>
      endCursor: Array<{id: string, createdAt: string}>
    }>({ query })

    const v = (res.totalCount[0]?.count ?? 0) !== 0

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.posts ?? [],
      edge: {
        node: res.edge[0],
        cursor: atob(res.edge[0]?.createdAt)
      },
      pageInfo: {
        startCursor: res.startCursor[0]?.createdAt,
        endCursor: res.endCursor[0]?.createdAt,
        hasNextPage: false,
        hasPreviousPage: v
      }
    }
  }

  async postsWithRelayForwardInit (first: number): Promise<PostsConnectionWithRelay> {
    const query = `
      query {
        test(func: type(Post), orderdesc: createdAt) @filter(not has(delete)) { 
          posts as uid
        }
        totalCount(func: uid(posts)) {
          count: count(uid) 
        }
        posts(func: uid(posts), orderdesc: createdAt, first: ${first}) {
          id: uid
          nodes as uid
          expand(_all_)
        }
        # 边界
        edge(func: uid(nodes), first: 1) {
          id: uid
          expand(_all_)  
        }
        # 开始游标
        startCursor(func: uid(posts), first: -1) {
          id: uid
          createdAt
        }
        # 结束游标
        endCursor(func: uid(posts), first: 1) {
          id: uid
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      posts: Post[]
      startCursor: Array<{id: string, createdAt: string}>
      endCursor: Array<{id: string, createdAt: string}>
      edge: Post[]
    }>({ query })

    const v = (res.totalCount[0]?.count ?? 0) !== 0

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.posts ?? [],
      edge: {
        node: res.edge[0],
        cursor: atob(res.edge[0]?.createdAt)
      },
      pageInfo: {
        endCursor: res.endCursor[0]?.createdAt,
        startCursor: res.startCursor[0]?.createdAt,
        hasNextPage: v,
        hasPreviousPage: false
      }
    }
  }

  async postsWithRelay ({ first, last, before, after }: RelayPagingConfigArgs): Promise<Nullable<PostsConnectionWithRelay>> {
    if ((before && after) || (first && last)) {
      throw new ForbiddenException('同一时间只能使用after作为向后分页、before作为向前分页的游标')
    }
    if (!before && !after && !first && !last) {
      throw new ForbiddenException('必须指定向前分页或者向后分页')
    }

    if (after && first && !before && !last) {
      after = btoa(after)
      return await this.postsWithRelayForward(first, after)
    }

    if (before && last && !after && !first) {
      before = btoa(before)
      return await this.postsWithRelayBackward(last, before)
    }

    if (first && !after && !last && !before) {
      return await this.postsWithRelayForwardInit(first)
    }

    if (!first && !after && last && !before) {
      return await this.postsWithRelayBackwardInit(last)
    }

    return null
  }

  async posts (first: number, offset: number) {
    const query = `
        query {
          totalCount(func: type(Post)) @filter(type(Post) AND NOT has(delete)) {
            count(uid)
          }
          v(func: type(Post), orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Post) AND NOT has(delete)) {
            id: uid
            expand(_all_)
          }
        }
      `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .query(query))
      .getJson() as unknown as {
      totalCount: Array<{count: number}>
      v: Post[]
    }
    const u: PostsConnection = {
      nodes: res.v || [],
      totalCount: res.totalCount[0].count
    }
    return u
  }

  async creator (id: PostId) {
    const query = `
      query v($postId: string) {
        post(func: uid($postId)) @filter(type(Post) and not has(anonymous)) {
          creator @filter(type(User)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{post: Array<Nullable<{creator: Nullable<UserWithFacets>}>>}>({ query, vars: { $postId: id } })
    const creator = res.post[0]?.creator
    return DeletePrivateValue<User>(creator)
  }

  /**
   * 返回帖子的点赞 并计算当前浏览者是否点赞
   * @param viewerId 浏览者id
   * @param postId 帖子id
   * @returns { Promise<VotesConnection> }
   */
  async getVotesByPostId (viewerId: string, postId: string, first: number, offset: number): Promise<VotesConnection> {
    if (!viewerId) {
      const query = `
        query v($postId: string) {
          totalCount(func: uid($postId)) @filter(type(Post)) {
            count: count(votes @filter(type(Vote)))
          }
          post(func: uid($postId)) @filter(type(Post)) {
            votes (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Vote)) {
              id: uid
              expand(_all_)
            }
          }
        }
      `
      const res = await this.dbService.commitQuery<{
        totalCount: Array<{count: number}>
        post: Array<{ votes: Vote[]}>
      }>({ query, vars: { $postId: postId } })
      return {
        nodes: res.post[0]?.votes ?? [],
        totalCount: res.totalCount[0]?.count ?? 0,
        viewerCanUpvote: true,
        viewerHasUpvoted: false
      }
    }
    const query = `
      query v($viewerId: string, $postId: string) {
        q(func: uid($postId)) @filter(type(Post)) {
          v: votes @filter(uid_in(creator, $viewerId) AND type(Vote)) {
            uid
          }
          totalCount: count(votes)
        }
        v(func: uid($postId)) @filter(type(Post)) {
          votes (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Vote)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = (await this.dgraph
      .newTxn({ readOnly: true })
      .queryWithVars(query, { $viewerId: viewerId, $postId: postId }))
      .getJson() as unknown as {
      q: Array<{v?: Array<{uid: string}>, totalCount: number}>
      v: Array<{votes?: Vote[]}>
    }
    const u: VotesConnection = {
      nodes: res.v[0]?.votes || [],
      totalCount: res.q[0].totalCount,
      viewerHasUpvoted: res.q[0].v !== undefined,
      viewerCanUpvote: res.q[0].v === undefined
    }
    return u
  }
}
