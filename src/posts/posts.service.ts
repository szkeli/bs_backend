import { ForbiddenException, Injectable } from '@nestjs/common'
import dgraph, { DgraphClient, Mutation, Request } from 'dgraph-js'

import { DbService } from 'src/db/db.service'
import { PostId } from 'src/db/model/db.model'

import { Anonymous } from '../anonymous/models/anonymous.model'
import { PostNotFoundException, SubjectNotFoundException, SystemAdminNotFoundException, UniversityNotFoundException, UserNotFoundException } from '../app.exception'
import { CensorsService } from '../censors/censors.service'
import { CENSOR_SUGGESTION } from '../censors/models/censors.model'
import { Comment, CommentsConnection } from '../comment/models/comment.model'
import { ORDER_BY } from '../connections/models/connections.model'
import { Delete } from '../deletes/models/deletes.model'
import { NlpService } from '../nlp/nlp.service'
import { Subject } from '../subject/model/subject.model'
import { atob, btoa, DeletePrivateValue, edgify, edgifyByKey, getCurosrByScoreAndId, handleRelayBackwardBefore, handleRelayForwardAfter, imagesV2ToImages, now, relayfyArrayForward, RelayfyArrayParam, sha1 } from '../tool'
import { University } from '../universities/models/universities.models'
import { PagingConfigArgs, User, UserWithFacets } from '../user/models/user.model'
import { Vote, VotesConnection, VotesConnectionWithRelay } from '../votes/model/votes.model'
import {
  CreatePostArgs,
  IImage,
  Nullable,
  Post,
  PostsConnection,
  PostsConnectionWithRelay,
  QueryPostsFilter,
  RelayPagingConfigArgs
} from './models/post.model'

@Injectable()
export class PostsService {
  async subject (id: string): Promise<Subject | null> {
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

  private readonly dgraph: DgraphClient
  constructor (
    private readonly dbService: DbService,
    private readonly censorsService: CensorsService,
    private readonly nlpService: NlpService
  ) {
    this.dgraph = dbService.getDgraphIns()
  }

  async university (id: string): Promise<University> {
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(Post)) {
          university as ~posts @filter(type(University))
        }
        university(func: uid(university)) {
          id: uid
          expand(_all_)
        }
      }
    `
    const res = await this.dbService.commitQuery<{university: University[]}>({
      query,
      vars: { $id: id }
    })

    return res.university[0]
  }

  async imagesV2 (id: string): Promise<string[]> {
    const query = `
      query v($id: string) {
        var(func: uid($id)) @filter(type(Post)) {
          post as uid
          imagesV2 as imagesV2 @filter(type(Image))
        }
        imagesV2(func: uid(imagesV2), orderasc: index)  {
          id: uid
          expand(_all_)
        }
        post(func: uid(post)) {
          images
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      imagesV2: [IImage]
      post: Array<{images: string[]}>
    }>({ query, vars: { $id: id } })

    if (res.post[0]?.images) {
      return res.post[0]?.images
    }

    return imagesV2ToImages(res.imagesV2)
  }

  async hashtags (id: string, args: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
  }

  async foldedCommentsWithRelay (id: string, { first, after, last, before, orderBy }: RelayPagingConfigArgs) {
    after = btoa(after)
    before = btoa(before)

    if (first && ORDER_BY.CREATED_AT_DESC === orderBy) {
      return await this.foldedCommentsWithRelayForward(id, first, after)
    }
    throw new Error('Method not implemented.')
  }

  async foldedCommentsWithRelayForward (postId: string, first: number, after: string) {
    const q1 = 'var(func: uid(comments), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($postId: string, $after: string) {
        var(func: uid($postId)) @filter(type(Post)) {
          comments as comments (orderdesc: createdAt) @filter(type(Comment) and has(fold))
        }

        ${after ? q1 : ''}
        totalCount(func: uid(comments)) {
          count(uid)
        }
        comments(func: uid(${after ? 'q' : 'comments'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
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
      startComment: Array<{createdAt: string}>
      endComment: Array<{createdAt: string}>
      comments: Comment[]
    }>({ query, vars: { $postId: postId, $after: after } })

    return relayfyArrayForward({
      totalCount: res.totalCount,
      startO: res.startComment,
      endO: res.endComment,
      objs: res.comments,
      first,
      after
    })
  }

  async anonymous (id: string): Promise<Anonymous> {
    const query = `
      query v($postId: string) {
        post(func: uid($postId)) @filter(type(Post)) {
          id: uid
          creator @filter(type(User)) {
            id: uid
            subCampus
          }
          anonymous @filter(type(Anonymous)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      post: Array<{id: string, anonymous: Anonymous, creator: {id: string, subCampus?: string | null}}>
    }>({ query, vars: { $postId: id } })

    const anonymous = res.post[0]?.anonymous
    const postId = res.post[0]?.id
    const creatorId = res.post[0]?.creator?.id
    const subCampus = res.post[0]?.creator?.subCampus

    if (anonymous) {
      anonymous.watermark = sha1(`${postId}${creatorId}`)
      anonymous.subCampus = subCampus
    }

    return anonymous
  }

  async postsCreatedWithin (startTime: string, endTime: string, first: number, offset: number): Promise<PostsConnection> {
    const query = `
      query v($startTime: string, $endTime: string) {
        var(func: type(User)) @filter(not eq(openId, "") and not eq(unionId, "")) {
          v as posts @filter(not has(delete))
        }
        var(func: between(createdAt, $startTime, $endTime)) @filter(uid(v)) {
          posts as uid
        }
        totalCount(func: uid(posts)) {
          count(uid)
        }
        posts(func: uid(posts), orderdesc: createdAt, first: ${first}, offset: ${offset}) {
          id: uid
          expand(_all_)
        }
      }
    `

    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      posts: Post[]
    }>({ query, vars: { $startTime: startTime, $endTime: endTime } })

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.posts ?? []
    }
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
          comments as comments @filter(type(Comment) and not has(delete)) {
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

  async trendingPostsWithRelayForward (first: number, after: string, { universityId }: QueryPostsFilter): Promise<PostsConnectionWithRelay> {
    const q1 = 'var(func: uid(posts), orderdesc: val(score)) @filter(lt(val(score), $after)) { q as uid }'
    const university = universityId
      ? `
      var(func: uid($universityId)) @filter(type(University)) {
        pre as posts(orderdesc: createdAt) @filter(type(Post))
      }
    `
      : `
      var(func: type(Post)) {
        pre as uid
      }
    `
    const query = `
      query v($after: string, $universityId: string) {
        ${university}
        v as var(func: uid(pre)) @filter(not has(delete) and not has(pin)) {
          vc as count(votes @filter(type(Vote)))
          votesCount as math(sqrt(vc * 2))
          # TODO
          c as count(comments @filter(type(Comment)))
          commentsCount as math(c * 0.5)
          createdAt as createdAt
        
          hour as math(
           2*exp(-(since(createdAt)/72000))
          )
          dayScore as math(since(createdAt)/86400)
          score as math(votesCount + commentsCount + hour)
        }
        posts as var(func: uid(v)) @filter(gt(val(score), 0) and lt(val(dayScore), 2))

        ${after ? q1 : ''}
        
        totalCount(func: uid(posts)) { count(uid) }
        posts(func: uid(${after ? 'q' : 'posts'}), orderdesc: val(score), first: ${first}) {
          score: val(score)
          timeScore: val(hour)
          voteScore: val(votesCount)
          commentScore: val(commentsCount)
          dayScore: val(dayScore)
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
    }>({
      query,
      vars: { $after: after, $universityId: universityId }
    })

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

  async trendingPostsWithRelay ({ first, before, last, after, orderBy }: RelayPagingConfigArgs, filter: QueryPostsFilter) {
    after = btoa(after)
    if (after) {
      try {
        after = JSON.parse(after).score
      } catch {
        throw new ForbiddenException(`游标 ${after} 解析错误`)
      }
    }
    if (first) {
      return await this.trendingPostsWithRelayForward(first, after, filter)
    }
  }

  async trendingPosts (first: number, offset: number): Promise<PostsConnection> {
    if (first + offset > 30) {
      throw new ForbiddenException('first + offset 应该小于30')
    }
    // TODO
    const query = `
    query v($first: int, $offset: int) {
      posts as var(func: type(Post)) @filter(not has (delete)) {
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
        score: val(score)
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

  async createPostTxn (id: string, args: CreatePostArgs, txn: dgraph.Txn): Promise<Post> {
    const { content, images, isAnonymous } = args

    // 审查帖子文本内容
    const textCensor = await this.censorsService.textCensor(content)
    // 获取帖子文本的情感信息
    const _sentiment = await this.nlpService.sentimentAnalysis(content)
    // 处理帖子图片
    const imagesV2 = images?.map((image, index) => (
      {
        uid: `_:image_${index}`,
        'dgraph.type': 'Image',
        value: image,
        index
      }
    ))
    const query = `
        query v($creatorId: string) {
          # system 是否存在
          s(func: eq(userId, "system")) @filter(type(Admin)) { system as uid }
          # creator 是否存在
          v(func: uid($creatorId)) @filter(type(User) and not has(delete)) { v as uid }
        }
      `
    // 帖子的匿名信息
    const anonymous = {
      uid: '_:anonymous',
      'dgraph.type': 'Anonymous',
      creator: {
        uid: id
      },
      to: {
        uid: '_:post'
      }
    }
    // 帖子的情感信息
    const sentiment = {
      uid: '_:sentiment',
      'dgraph.type': 'Sentiment',
      negative: _sentiment.negative,
      neutral: _sentiment.neutral,
      positive: _sentiment.positive,
      value: _sentiment.sentiment
    }

    /**
     * 含有违规内容的帖子
     * 自动添加删除标志
     */
    const _delete = {
      uid: '_:delete',
      'dgraph.type': 'Delete',
      createdAt: now(),
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
    const condition = '@if( eq(len(v), 1) and eq(len(system), 1) )'
    const mutation = {
      uid: 'uid(v)',
      posts: {
        uid: '_:post',
        'dgraph.type': 'Post',
        creator: {
          uid: 'uid(v)'
        },
        sentiment,
        content,
        createdAt: now()
      }
    }

    if (isAnonymous) {
      Object.assign(mutation.posts, { anonymous })
    }
    if ((imagesV2?.length ?? 0) !== 0) {
      Object.assign(mutation.posts, { imagesV2 })
    }
    if ((textCensor?.suggestion ?? CENSOR_SUGGESTION.PASS) === CENSOR_SUGGESTION.BLOCK) {
      Object.assign(mutation.posts, { delete: _delete })
    }

    // 创建新帖子
    const mutate = new Mutation()
    mutate.setSetJson(mutation)
    mutate.setCond(condition)
    const request = new Request()
    const vars = request.getVarsMap()
    request.setQuery(query)
    request.addMutations(mutate)
    vars.set('$creatorId', id)
    const res = await txn.doRequest(request)
    const json = res.getJson() as unknown as {
      s: Array<{uid: string}>
      v: Array<{uid: string}>
    }
    const uids = res.getUidsMap()

    if (json.s.length !== 1) {
      throw new SystemAdminNotFoundException()
    }
    if (json.v.length !== 1) {
      throw new UserNotFoundException(id)
    }

    return {
      id: uids.get('post'),
      content,
      createdAt: now()
    }
  }

  async addPostToSubjectTxn (postId: string, args: CreatePostArgs, txn: dgraph.Txn) {
    const { subjectId } = args
    if (!subjectId) { return }

    const query = `
      query v($subjectId: string, $postId: string) {
        p(func: uid($postId)) @filter(type(Post)) { p as uid }
        s(func: uid($subjectId)) @filter(type(Subject)) { s as uid }
      }
    `
    const condition = '@if( eq(len(p), 1) and eq(len(s), 1) )'
    const mutation = {
      uid: 'uid(s)',
      posts: {
        uid: 'uid(p)'
      }
    }

    const mutate = new Mutation()
    mutate.setSetJson(mutation)
    mutate.setCond(condition)
    const request = new Request()
    const vars = request.getVarsMap()
    vars.set('$subjectId', subjectId)
    vars.set('$postId', postId)

    request.setQuery(query)
    request.addMutations(mutate)
    const res = await txn.doRequest(request)

    const json = res.getJson() as unknown as {
      p: Array<{uid: string}>
      s: Array<{uid: string}>
    }
    if (json.p.length !== 1) {
      throw new PostNotFoundException(postId)
    }
    if (json.s.length !== 1) {
      throw new SubjectNotFoundException(subjectId)
    }
  }

  async addPostToUniversityTxn (postId: string, args: CreatePostArgs, txn: dgraph.Txn) {
    const { universityId } = args
    const query = `
      query v($postId: string, $universityId: string) {
        p(func: uid($postId)) @filter(type(Post)) { p as uid }
        u(func: uid($universityId)) @filter(type(University)) { u as uid }
      }
    `
    const condition = '@if( eq(len(p), 1) and eq(len(u), 1) )'
    const mutation = {
      uid: 'uid(u)',
      posts: {
        uid: 'uid(p)'
      }
    }

    const mutate = new Mutation()
    mutate.setSetJson(mutation)
    mutate.setCond(condition)
    const request = new Request()
    const vars = request.getVarsMap()
    vars.set('$universityId', universityId)
    vars.set('$postId', postId)
    request.setQuery(query)
    request.addMutations(mutate)
    const res = await txn.doRequest(request)

    const json = res.getJson() as unknown as {
      p: Array<{uid: string}>
      u: Array<{uid: string}>
    }
    if (json.p.length !== 1) {
      throw new PostNotFoundException(postId)
    }
    if (json.u.length !== 1) {
      throw new UniversityNotFoundException(universityId)
    }
  }

  async createPost (id: string, args: CreatePostArgs): Promise<Post> {
    const txn = this.dbService.getDgraphIns().newTxn()
    try {
      const post = await this.createPostTxn(id, args, txn)
      await this.addPostToSubjectTxn(post.id, args, txn)
      await this.addPostToUniversityTxn(post.id, args, txn)
      await txn.commit()
      return post
    } finally {
      await txn.discard()
    }
  }

  async post (id: PostId): Promise<Post> {
    const query = `
        query v($uid: string) {
          post(func: uid($uid)) @filter(type(Post) and not has(delete)) {
            id: uid
            expand(_all_) 
          }
        }
      `
    const res = await this.dbService.commitQuery<{
      post: Post[]
    }>({
      query,
      vars: {
        $uid: id
      }
    })

    if (!res || !res.post || res.post.length !== 1) {
      throw new PostNotFoundException(id)
    }
    return res.post[0]
  }

  async postsWithRelayForward (first: number, after: string | null, { universityId }: QueryPostsFilter): Promise<PostsConnectionWithRelay> {
    const q1 = 'var(func: uid(posts), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const university = universityId
      ? `
      var(func: uid($universityId)) @filter(type(University)) {
        posts as posts(orderdesc: createdAt) @filter(type(Post) and not has(delete) and not has(pin))
      }
    `
      : `
      var(func: type(Post), orderdesc: createdAt) @filter(not has(delete) and not has(pin)) { 
        posts as uid
      }
    `
    const query = `
      query v($after: string, $universityId: string) {
        ${university}
        ${after ? q1 : ''}
        totalCount(func: uid(posts)) { count(uid) }
        objs(func: uid(${after ? 'q' : 'posts'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        startO(func: uid(posts), first: -1) { createdAt }
        endO(func: uid(posts), first: 1) { createdAt }
      }
    `
    const res = await this.dbService.commitQuery<RelayfyArrayParam<Post>>({
      query,
      vars: { $after: after, $universityId: universityId }
    })

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async postsWithRelayBackward (last: number, before: string | null, { universityId }: QueryPostsFilter): Promise<PostsConnectionWithRelay> {
    const q1 = `
      var(func: uid(posts), orderdesc: createdAt) @filter(gt(createdAt, $before)) { q as uid }
      var(func: uid(q), orderasc: createdAt, first: ${last}) { v as uid }
    `
    const q2 = `
      var(func: uid(posts), orderasc: createdAt, first: ${last}) { v as uid }
    `
    const university = universityId
      ? `
      var(func: uid($universityId)) @filter(type(University)) {
        posts as posts(orderdesc: createdAt) @filter(not has(delete))
      }
    `
      : `
      var(func: type(Post), orderdesc: createdAt) @filter(not has(delete)) { 
        posts as uid
      }
    `
    const query = `
    query v($before: string, $universityId: string) {
      ${university}
      totalCount(func: uid(posts)) { count(uid) }

      ${before ? q1 : q2}
      posts(func: uid(v), orderdesc: createdAt) {
        id: uid
        expand(_all_)
      }
      # 开始游标
      startPost(func: uid(v), first: -1) {
        id: uid
        createdAt
      }
      # 结束游标
      endPost(func: uid(v), first: 1) {
        id: uid
        createdAt
      }
    }
  `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      posts: Post[]
      edge: Post[]
      startPost: Array<{id: string, createdAt: string}>
      endPost: Array<{id: string, createdAt: string}>
    }>({ query, vars: { $before: before, $universityId: universityId } })

    const startPost = res.startPost[0]
    const endPost = res.endPost[0]
    const lastPost = res.posts.slice(-1)[0]
    const v = (res.totalCount[0]?.count ?? 0) !== 0
    const hasNextPage = startPost?.createdAt !== before && res.posts.length === last
    const hasPreviousPage = before !== endPost?.createdAt && !!before

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      edges: edgify(res.posts ?? []),
      pageInfo: {
        endCursor: atob(lastPost?.createdAt),
        startCursor: atob(res.posts[0]?.createdAt),
        hasNextPage: hasNextPage && v,
        hasPreviousPage: hasPreviousPage && v
      }
    }
  }

  async postsWithRelay ({ first, last, before, after, orderBy }: RelayPagingConfigArgs, filter: QueryPostsFilter): Promise<Nullable<PostsConnectionWithRelay>> {
    after = handleRelayForwardAfter(after)
    before = handleRelayBackwardBefore(before)

    // TODO first 具有默认值，需要另外的判断逻辑
    if ((before && after) || (first && last)) {
      throw new ForbiddenException('同一时间只能使用after作为向后分页、before作为向前分页的游标')
    }
    // TODO: fix: !first !last 对 last===0也生效
    if (!before && !after && !first && !last) {
      throw new ForbiddenException('必须指定向前分页或者向后分页')
    }

    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.postsWithRelayForward(first, after, filter)
    }

    if (first && orderBy === ORDER_BY.TRENDING) {
      if (after) {
        try {
          after = JSON.parse(after).score
        } catch {
          throw new ForbiddenException(`游标 ${after} 解析失败`)
        }
      }
      return await this.trendingPostsWithRelayForward(first, after, filter)
    }

    if (last) {
      return await this.postsWithRelayBackward(last, before, filter)
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

  async votes (viewerId: string, id: string, { first, after, orderBy }: RelayPagingConfigArgs): Promise<VotesConnectionWithRelay> {
    after = btoa(after)
    if (viewerId && first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.votesWithViewerIdWithRelayForward(viewerId, id, first, after)
    }

    if (!viewerId && first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.votesWithRelayForward(id, first, after)
    }

    throw new Error('Method not implemented.')
  }

  async votesWithRelayForward (id: string, first: number, after: string): Promise<VotesConnectionWithRelay> {
    const q1 = 'var(func: uid(votes), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $after: string) {
        var(func: uid($id)) @filter(type(Post)) {
          votes as votes (orderdesc: createdAt) @filter(type(Vote))
        }
        ${after ? q1 : ''}
        totalCount(func: uid(votes)) { count(uid) }
        votes(func: uid(${after ? 'q' : 'votes'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startVote(func: uid(votes), first: -1) {
          createdAt
        }
        # 结束游标
        endVote(func: uid(votes), first: 1) {
          createdAt
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startVote: Array<{createdAt: string}>
      endVote: Array<{createdAt: string}>
      votes: Vote[]
    }>({ query, vars: { $id: id, $after: after } })

    return {
      ...relayfyArrayForward({
        totalCount: res.totalCount,
        startO: res.startVote,
        endO: res.endVote,
        objs: res.votes,
        first,
        after
      }),
      viewerCanUpvote: true,
      viewerHasUpvoted: false
    }
  }

  async votesWithViewerIdWithRelayForward (viewerId: string, id: string, first: number, after: string): Promise<VotesConnectionWithRelay> {
    const q1 = 'var(func: uid(votes), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    const query = `
      query v($id: string, $viewerId: string, $after: string) {
        var(func: uid($id)) @filter(type(Post)) {
          votes as votes (orderdesc: createdAt) @filter(type(Vote))
        }
        # viewer是否已经点赞
        v(func: uid(votes)) @filter(uid_in(creator, $viewerId)) { uid }
        ${after ? q1 : ''}
        totalCount(func: uid(votes)) { count(uid) }
        votes(func: uid(${after ? 'q' : 'votes'}), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
        }
        # 开始游标
        startVote(func: uid(votes), first: -1) {
          createdAt
        }
        # 结束游标
        endVote(func: uid(votes), first: 1) {
          createdAt
        }
      }
    `

    const res = await this.dbService.commitQuery<{
      totalCount: Array<{count: number}>
      startVote: Array<{createdAt: string}>
      endVote: Array<{createdAt: string}>
      votes: Vote[]
      v: Array<{uid: string}>
    }>({
      query,
      vars: {
        $id: id,
        $after: after,
        $viewerId: viewerId
      }
    })

    const can = res.v.length === 0

    return {
      ...relayfyArrayForward({
        totalCount: res.totalCount,
        startO: res.startVote,
        endO: res.endVote,
        objs: res.votes,
        first,
        after
      }),
      viewerCanUpvote: can,
      viewerHasUpvoted: !can
    }
  }

  /**
   * 返回帖子的点赞 并计算当前浏览者是否点赞
   * @param viewerId 浏览者id
   * @param postId 帖子id
   * @returns { Promise<VotesConnection> }
   */
  async getVotesByPostId (viewerId: string, postId: string, { offset, first }: PagingConfigArgs): Promise<VotesConnection> {
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

  /**
   * 返回对应帖子id下的评论
   * @param id 帖子id
   * @param first 前first条帖子
   * @param offset 偏移量
   * @returns {Promise<CommentsConnection>} CommentsConnection
   */
  async comments (id: PostId, first: number, offset: number): Promise<CommentsConnection> {
    const query = `
      query v($uid: string) {
        # 包含已经被折叠的帖子
        var(func: uid($uid)) @recurse(loop: false) {
          A as uid
          comments
        }

        totalCount(func: uid(A)) @filter(type(Comment) and not uid($uid) and not has(delete)) {
          count(uid)
        }

        post(func: uid($uid)) @filter(type(Post)) {
          comments (orderdesc: createdAt, first: ${first}, offset: ${offset}) @filter(type(Comment) and not has(delete) and not has(fold)) {
            id: uid
            expand(_all_)
          }
        }
      }
    `
    const res = await this.dbService.commitQuery<{
      post: Array<{ comments?: Comment[]}>
      totalCount: Array<{count: number}>
    }>({ query, vars: { $uid: id } })

    if (!res.post) {
      throw new ForbiddenException(`帖子 ${id} 不存在`)
    }

    return {
      nodes: res.post[0]?.comments ?? [],
      totalCount: res.totalCount[0]?.count ?? 0
    }
  }
}
