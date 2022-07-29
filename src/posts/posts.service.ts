import {
  ForbiddenException,
  Injectable,
  NotImplementedException
} from '@nestjs/common'
import dgraph, { DgraphClient, Mutation, Request } from 'dgraph-js'

import { DbService, Txn } from 'src/db/db.service'
import { PostId } from 'src/db/model/db.model'

import {
  ParseCursorFailedException,
  PostNotFoundException,
  RelayPagingConfigErrorException,
  SubjectNotFoundException,
  SubjectNotInTheUniversityException,
  SystemAdminNotFoundException,
  SystemErrorException,
  UniversityNotFoundException,
  UserNotFoundException
} from '../app.exception'
import { CensorsService } from '../censors/censors.service'
import { CENSOR_SUGGESTION } from '../censors/models/censors.model'
import {
  ORDER_BY,
  RelayPagingConfigArgs
} from '../connections/models/connections.model'
import { Delete } from '../deletes/models/deletes.model'
import { NlpService } from '../nlp/nlp.service'
import {
  atMostOne,
  atob,
  btoa,
  edgify,
  edgifyByKey,
  getCurosrByScoreAndId,
  handleRelayBackwardBefore,
  handleRelayForwardAfter,
  imagesV2ToImages,
  NotNull,
  now,
  relayfyArrayForward,
  RelayfyArrayParam
} from '../tool'
import {
  CreatePostArgs,
  IImage,
  Nullable,
  Post,
  PostsConnection,
  PostsConnectionWithRelay,
  QueryPostsFilter
} from './models/post.model'

@Injectable()
export class PostsService {
  private readonly dgraph: DgraphClient
  constructor (
    private readonly dbService: DbService,
    private readonly censorsService: CensorsService,
    private readonly nlpService: NlpService
  ) {
    this.dgraph = dbService.getDgraphIns()
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
      post: Array<{ images: string[] }>
    }>({ query, vars: { $id: id } })

    if (res.post[0]?.images) {
      return res.post[0]?.images
    }

    return imagesV2ToImages(res.imagesV2)
  }

  async hashtags (id: string, args: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
  }

  async postsCreatedWithin (
    startTime: string,
    endTime: string,
    first: number,
    offset: number
  ): Promise<PostsConnection> {
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
      totalCount: Array<{ count: number }>
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
          dgrahp.type
        }
        totalCount(func: uid(v)) { count(uid) }
      }
    `
    const res = await this.dbService.commitQuery<{
      deletedPosts: Delete[]
      totalCount: Array<{ count: number }>
    }>({ query })

    return {
      totalCount: res.totalCount[0]?.count ?? 0,
      nodes: res.deletedPosts ?? []
    }
  }

  async trendingPostsWithRelayForward (
    first: number,
    after: string | null,
    { universityId, subjectId }: QueryPostsFilter
  ): Promise<PostsConnectionWithRelay> {
    const q1 =
      'var(func: uid(posts), orderdesc: val(score)) @filter(lt(val(score), $after)) { q as uid }'

    // 没有提供 UniversityId 也没有提供 SubjectId
    const a = `
      var(func: type(Post), orderdesc: createdAt) { 
        temp as uid
      }
    `
    // 提供了 UniversityId 但没有提供 SubjectId
    const b = `
      var(func: uid($universityId)) @filter(type(University) and not has(delete)) {
        temp as posts(orderdesc: createdAt)
      }
    `
    // 没有提供 UniversityId 提供了 SubjectId
    const c = `
      var(func: uid($subjectId)) @filter(type(Subject) and not has(delete)) {
        temp as posts(orderdesc: createdAt)
      }
    `
    // 提供了 UniversityId 和 SubjectId
    // 该 Subject 必须在该 University 内
    const d = `
      var(func: uid($universityId)) @filter(type(University) and not has(delete)) {
        subjects as subjects @filter(uid($subjectId) and type(Subject) and not has(delete))
      }
      subjects(func: uid(subjects)) {
        uid
      }
      var(func: uid(subjects)) {
        temp as posts(orderdesc: createdAt)
      }
    `

    const query = `
      query v($after: string, $universityId: string, $subjectId: string) {
        ${!NotNull(universityId) && !NotNull(subjectId) ? a : ''}
        ${NotNull(universityId) && !NotNull(subjectId) ? b : ''}
        ${!NotNull(universityId) && NotNull(subjectId) ? c : ''}
        ${NotNull(universityId) && NotNull(subjectId) ? d : ''}

        var(func: uid(temp)) @filter(type(Post) and not has(delete) and not has(pin) and has(createdAt)) {
          pre as uid
        }
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
        posts(func: uid(${
          after ? 'q' : 'posts'
        }), orderdesc: val(score), first: ${first}) {
          score: val(score)
          timeScore: val(hour)
          voteScore: val(votesCount)
          commentScore: val(commentsCount)
          dayScore: val(dayScore)
          id: uid
          expand(_all_)
          dgraph.type
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
      totalCount: Array<{ count: number }>
      posts: Array<Post & { score: number }>
      startPost: Array<{ score: number }>
      endPost: Array<{ score: number }>
      subjects: Array<{ uid: string }>
    }>({
      query,
      vars: {
        $after: after,
        $universityId: universityId,
        $subjectId: subjectId
      }
    })

    if (NotNull(universityId, subjectId) && res.subjects.length === 0) {
      throw new SubjectNotInTheUniversityException(universityId, subjectId)
    }

    const totalCount = res.totalCount[0]?.count ?? 0
    const v = totalCount !== 0

    const firstPost = res.posts[0]
    const lastPost = res.posts?.slice(-1)[0]
    const startPost = res.startPost[0]
    const endPost = res.endPost[0]
    const startCursor = getCurosrByScoreAndId(firstPost?.id, firstPost?.score)
    const endCursor = getCurosrByScoreAndId(lastPost?.id, lastPost?.score)

    const hasNextPage =
      endPost?.score !== lastPost?.score &&
      res.posts.length === first &&
      endPost?.score?.toString() !== after
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

  async trendingPostsWithRelay (
    { first, before, last, after, orderBy }: RelayPagingConfigArgs,
    filter: QueryPostsFilter
  ) {
    after = btoa(after)
    if (after) {
      try {
        after = JSON.parse(after).score
      } catch {
        throw new ParseCursorFailedException(after ?? '')
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
        dgraph.type
      } 
    }
  `
    const res = await this.dbService.commitQuery<{
      totalCount: Array<{ count: 13 }>
      posts: Post[]
    }>({ query, vars: { $first: `${first}`, $offset: `${offset}` } })

    return {
      nodes: res.posts ?? [],
      totalCount: res.totalCount[0]?.count ?? 0
    }
  }

  async createPostTxn (
    id: string,
    args: CreatePostArgs,
    txn: dgraph.Txn
  ): Promise<Post> {
    const { content, images, isAnonymous } = args

    // 审查帖子文本内容
    const textCensor = await this.censorsService.textCensor(content)
    // 获取帖子文本的情感信息
    const _sentiment = await this.nlpService.sentimentAnalysis(content)
    // 处理帖子图片
    const imagesV2 = images?.map((image, index) => ({
      uid: `_:image_${index}`,
      'dgraph.type': 'Image',
      value: image,
      index
    }))
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
      },
      createdAt: now()
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
    if (
      (textCensor?.suggestion ?? CENSOR_SUGGESTION.PASS) ===
      CENSOR_SUGGESTION.BLOCK
    ) {
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
      s: Array<{ uid: string }>
      v: Array<{ uid: string }>
    }
    const uids = res.getUidsMap()

    if (json.s.length !== 1) {
      throw new SystemAdminNotFoundException()
    }
    if (json.v.length !== 1) {
      throw new UserNotFoundException(id)
    }

    const _id = uids.get('post')
    if (!_id) throw new SystemErrorException()

    return {
      id: _id,
      content,
      createdAt: now()
    }
  }

  async addPostToSubjectTxn (
    postId: string,
    subjectId: string,
    txn: dgraph.Txn
  ) {
    const query = `
      query v($subjectId: string, $postId: string) {
        p(func: uid($postId)) @filter(type(Post)) { p as uid }
        s(func: uid($subjectId)) @filter(type(Subject)) { 
          s as uid
          subfields as ~subject @filter(type(SubField)) 
        }
        subFields(func: uid(subfields)) {
          id: uid
        }
      }
    `
    const condition = '@if( eq(len(p), 1) and eq(len(s), 1) )'
    const mutation = {
      uid: 'uid(s)',
      posts: {
        uid: 'uid(p)'
      }
    }

    const res = await this.dbService.handleTransaction<{}, {
      p: Array<{ uid: string }>
      s: Array<{ uid: string }>
      subFields: Array<{ id: string }>
    }>(txn, {
      query,
      mutations: [{ set: mutation, cond: condition }],
      vars: { $subjectId: subjectId, $postId: postId }
    })

    if (res.json.p.length !== 1) {
      throw new PostNotFoundException(postId)
    }
    if (res.json.s.length !== 1) {
      throw new SubjectNotFoundException(subjectId)
    }

    return res.json.subFields.map(s => s.id)
  }

  async addPostToUniversityTxn (
    postId: string,
    args: CreatePostArgs,
    txn: dgraph.Txn
  ) {
    const { universityId } = args
    const query = `
      query v($postId: string, $universityId: string) {
        p(func: uid($postId)) @filter(type(Post)) { p as uid }
        u(func: uid($universityId)) @filter(type(University)) { u as uid }
        # 帖子的创建者所在的 universities 包含待添加到的 university
        var(func: uid(p)) {
          creator @filter(type(User)) {
            temp as ~users @filter(type(University) and uid(u))
          }
        }
        in(func: uid(temp)) { in as uid }
      }
    `
    const condition = '@if( eq(len(p), 1) and eq(len(u), 1) and eq(len(in), 1) )'
    const mutation = {
      uid: 'uid(u)',
      posts: {
        uid: 'uid(p)'
      }
    }

    const res = await this.dbService.handleTransaction<{}, {
      p: Array<{ uid: string }>
      u: Array<{ uid: string }>
      in: Array<{ uid: string }>
    }>(txn, {
      query,
      mutations: [{ set: mutation, cond: condition }],
      vars: { $universityId: universityId, $postId: postId }
    })

    if (res.json.p.length !== 1) {
      throw new PostNotFoundException(postId)
    }
    if (res.json.u.length !== 1) {
      throw new UniversityNotFoundException(universityId)
    }
    if (res.json.in.length !== 1) {
      throw new ForbiddenException('用户不在该学校内')
    }
  }

  async createPost (id: string, args: CreatePostArgs): Promise<Post> {
    const { subjectId, subFieldId } = args
    const { takeAwayOrder, idleItemOrder, teamUpOrder } = args
    if (!atMostOne(takeAwayOrder, idleItemOrder, teamUpOrder)) {
      throw new ForbiddenException(
        '单个帖子最多只能携带 takeAwayOrder, idleItemOrder, teamUpOrder 中的一种订单'
      )
    }
    const res = await this.dbService.withTxn(async txn => {
      const post = await this.createPostTxn(id, args, txn)
      takeAwayOrder && (await this.createTakeAwayOrderTxn(args, post, txn))
      idleItemOrder && (await this.createIdleItemOrderTxn(args, post, txn))
      teamUpOrder && (await this.createTeamUpOrderTxn(args, post, txn))

      if (subjectId) {
        const subFieldIds = await this.addPostToSubjectTxn(post.id, subjectId, txn)
        if (subFieldId && !subFieldIds.includes(subFieldId)) {
          throw new ForbiddenException(`Subject ${subjectId} 没有 SubField ${subFieldId}`)
        }
        await this.addPostToSubFieldTxn(post.id, subFieldId, txn)
      }
      await this.addPostToUniversityTxn(post.id, args, txn)

      return post
    })

    return res
  }

  async addPostToSubFieldTxn (id: string, subFieldId: string, txn: Txn) {
    const query = `
      query v($id: string, $subFieldId: string) {
        p(func: uid($id)) @filter(type(Post)) { p as uid }
        s(func: uid($subFieldId)) @filter(type(SubField)) { s as uid }
      }
    `
    const condition = '@if( eq(len(p), 1) and eq(len(s), 1) )'
    const mutation = {
      uid: 'uid(s)',
      posts: {
        uid: 'uid(p)'
      }
    }
    return await this.dbService.handleTransaction(txn, {
      query,
      mutations: [{ set: mutation, cond: condition }],
      vars: { $id: id, $subFieldId: subFieldId }
    })
  }

  async createTeamUpOrderTxn (
    args: CreatePostArgs,
    post: Post,
    txn: dgraph.Txn
  ) {
    const { teamUpOrder } = args
    const {
      type,
      orderStartingPoint,
      orderDestination,
      departureTime,
      reserveAmounts,
      contactInfo,
      redeemCounts,
      expiredAt
    } = teamUpOrder
    const query = `
      query v($id: string) {
        p(func: uid($id)) @filter(type(Post)) { p as uid }
      }
    `
    const condition = '@if( eq(len(p), 1) )'
    const mutation = {
      uid: '_:teamuporder',
      'dgraph.type': 'TeamUpOrder',
      type,
      orderStartingPoint,
      orderDestination,
      departureTime,
      reserveAmounts,
      contactInfo,
      redeemCounts,
      createdAt: now(),
      expiredAt,
      post: {
        uid: 'uid(p)'
      }
    }
    await this.dbService.handleTransaction(txn, {
      query,
      mutations: [{ set: mutation, cond: condition }],
      vars: { $id: post.id }
    })
  }

  /**
   * 在事務中創建一個 IdleItemOrder 並附加到相應的 post
   * @param args
   * @param post
   * @param txn
   */
  async createIdleItemOrderTxn (
    args: CreatePostArgs,
    post: Post,
    txn: dgraph.Txn
  ) {
    const { idleItemOrder } = args
    // TODO: 测试 expiredAt, endTime, createdAt 有效性
    // TODO: 根据 type 清除部分属性
    const {
      orderDestination,
      reserveAmounts,
      redeemCounts,
      contactInfo,
      idleItemType,
      expiredAt
    } = idleItemOrder
    const query = `
      query v($id: string) {
        p(func: uid($id)) @filter(type(Post)) { p as uid }
      }
    `
    const condition = '@if( eq(len(p), 1) )'
    const mutation = {
      uid: '_:idleitemorder',
      'dgraph.type': 'IdleItemOrder',
      orderDestination,
      idleItemType,
      reserveAmounts,
      contactInfo,
      redeemCounts,
      createdAt: now(),
      expiredAt,
      post: {
        uid: 'uid(p)'
      }
    }
    const res = await this.dbService.handleTransaction<
    {},
    {
      p: Array<{ uid: string }>
    }
    >(txn, {
      query,
      mutations: [{ set: mutation, cond: condition }],
      vars: { $id: post.id }
    })

    if (res.json.p.length !== 1) {
      throw new PostNotFoundException(post.id)
    }
  }

  /**
   * 在事务中创建一个新的 TakeAway 订单并附加到相应的 Post
   * @param args
   * @param post
   * @param txn
   */
  async createTakeAwayOrderTxn (
    args: CreatePostArgs,
    post: Post,
    txn: dgraph.Txn
  ) {
    const { takeAwayOrder } = args
    // TODO: 测试 expiredAt, endTime, createdAt 有效性
    // TODO: 根据 type 清除部分属性
    const {
      type,
      orderStartingPoint,
      orderDestination,
      reserveAmounts,
      contactInfo,
      redeemCounts,
      expiredAt,
      endTime
    } = takeAwayOrder

    const query = `
      query v($postId: string) {
        p(func: uid($postId)) @filter(type(Post)) { p as uid }
      }
    `
    const condition = '@if( eq(len(p), 1) )'
    const mutation = {
      uid: '_:takeawayorder',
      'dgraph.type': 'TakeAwayOrder',
      contactInfo,
      orderStartingPoint,
      type,
      orderDestination,
      reserveAmounts,
      redeemCounts,
      expiredAt,
      endTime,
      createdAt: now(),
      post: {
        uid: 'uid(p)'
      }
    }

    const res = await this.dbService.handleTransaction<
    {},
    {
      p: Array<{ uid: string }>
    }
    >(txn, {
      query,
      mutations: [{ set: mutation, cond: condition }],
      vars: { $postId: post.id }
    })

    if (res.json.p.length !== 1) {
      throw new PostNotFoundException(post.id)
    }
  }

  async post (id: PostId): Promise<Post> {
    const query = `
        query v($uid: string) {
          post(func: uid($uid)) @filter(type(Post) and not has(delete)) {
            id: uid
            expand(_all_)
            dgraph.type
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

  async postsWithRelayForward (
    first: number,
    after: string | null,
    { universityId, subjectId }: QueryPostsFilter
  ): Promise<PostsConnectionWithRelay> {
    const q1 =
      'var(func: uid(posts), orderdesc: createdAt) @filter(lt(createdAt, $after)) { q as uid }'
    // 没有提供 UniversityId 也没有提供 SubjectId
    const a = `
      var(func: type(Post), orderdesc: createdAt) { 
        temp as uid
      }
    `
    // 提供了 UniversityId 但没有提供 SubjectId
    const b = `
      var(func: uid($universityId)) @filter(type(University) and not has(delete)) {
        temp as posts(orderdesc: createdAt)
      }
    `
    // 没有提供 UniversityId 提供了 SubjectId
    const c = `
      var(func: uid($subjectId)) @filter(type(Subject) and not has(delete)) {
        temp as posts(orderdesc: createdAt)
      }
    `
    // 提供了 UniversityId 和 SubjectId
    // 该 Subject 必须在该 University 内
    const d = `
      var(func: uid($universityId)) @filter(type(University) and not has(delete)) {
        subjects as subjects @filter(uid($subjectId) and type(Subject) and not has(delete))
      }
      subjects(func: uid(subjects)) {
        uid
      }
      var(func: uid(subjects)) {
        temp as posts(orderdesc: createdAt)
      }
    `

    const query = `
      query v($after: string, $universityId: string, $subjectId: string) {
        ${!NotNull(universityId) && !NotNull(subjectId) ? a : ''}
        ${NotNull(universityId) && !NotNull(subjectId) ? b : ''}
        ${!NotNull(universityId) && NotNull(subjectId) ? c : ''}
        ${NotNull(universityId) && NotNull(subjectId) ? d : ''}

        var(func: uid(temp)) @filter(type(Post) and not has(delete) and not has(pin) and has(createdAt)) {
          posts as uid
        }
        ${after ? q1 : ''}
        totalCount(func: uid(posts)) { count(uid) }
        objs(func: uid(${
          after ? 'q' : 'posts'
        }), orderdesc: createdAt, first: ${first}) {
          id: uid
          expand(_all_)
          dgraph.type
        }
        startO(func: uid(posts), first: -1) { createdAt }
        endO(func: uid(posts), first: 1) { createdAt }
      }
    `
    const res = await this.dbService.commitQuery<
    RelayfyArrayParam<Post> & {
      subjects: Array<{ uid: string }>
    }
    >({
      query,
      vars: {
        $after: after,
        $universityId: universityId,
        $subjectId: subjectId
      }
    })

    if (NotNull(universityId, subjectId) && res.subjects.length === 0) {
      throw new SubjectNotInTheUniversityException(universityId, subjectId)
    }

    return relayfyArrayForward({
      ...res,
      first,
      after
    })
  }

  async postsWithRelayBackward (
    last: number,
    before: string | null,
    { universityId }: QueryPostsFilter
  ): Promise<PostsConnectionWithRelay> {
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
      totalCount: Array<{ count: number }>
      posts: Post[]
      edge: Post[]
      startPost: Array<{ id: string, createdAt: string }>
      endPost: Array<{ id: string, createdAt: string }>
    }>({ query, vars: { $before: before, $universityId: universityId } })

    const startPost = res.startPost[0]
    const endPost = res.endPost[0]
    const lastPost = res.posts.slice(-1)[0]
    const v = (res.totalCount[0]?.count ?? 0) !== 0
    const hasNextPage =
      startPost?.createdAt !== before && res.posts.length === last
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

  async postsWithRelay (
    pagingConfig: RelayPagingConfigArgs,
    filter: QueryPostsFilter
  ): Promise<Nullable<PostsConnectionWithRelay>> {
    let { first, last, before, after, orderBy } = pagingConfig

    after = handleRelayForwardAfter(after)
    before = handleRelayBackwardBefore(before)

    if (NotNull(first, last) || NotNull(before, after)) {
      throw new RelayPagingConfigErrorException(
        '同一时间只能使用after作为向后分页、before作为向前分页的游标'
      )
    }

    if (first && orderBy === ORDER_BY.CREATED_AT_DESC) {
      return await this.postsWithRelayForward(first, after, filter)
    }

    if (first && orderBy === ORDER_BY.TRENDING) {
      if (after) {
        try {
          after = JSON.parse(after).score
        } catch {
          throw new ParseCursorFailedException(after ?? '')
        }
      }
      return await this.trendingPostsWithRelayForward(first, after, filter)
    }

    if (last) {
      return await this.postsWithRelayBackward(last, before, filter)
    }

    throw new NotImplementedException()
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
            dgraph.type
          }
        }
      `
    const res = (
      await this.dgraph.newTxn({ readOnly: true }).query(query)
    ).getJson() as unknown as {
      totalCount: Array<{ count: number }>
      v: Post[]
    }
    const u: PostsConnection = {
      nodes: res.v || [],
      totalCount: res.totalCount[0].count
    }
    return u
  }
}
