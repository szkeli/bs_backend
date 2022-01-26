import { ForbiddenException, Injectable } from '@nestjs/common'
import { DgraphClient } from 'dgraph-js'

import { DbService } from 'src/db/db.service'
import { PostId } from 'src/db/model/db.model'

import { Comment, CommentsConnection } from '../comment/models/comment.model'
import { User } from '../user/models/user.model'
import { Vote, VotesConnection } from '../votes/model/votes.model'
import { CreatePostArgs, Nullable, Post, PostsConnection, PostWithCreatorId } from './models/post.model'

@Injectable()
export class PostsService {
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

  private readonly dgraph: DgraphClient
  constructor (private readonly dbService: DbService) {
    this.dgraph = dbService.getDgraphIns()
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

  async createPost (creator: string, { title, content, images, subjectId, isAnonymous }: CreatePostArgs): Promise<Post> {
    let condition: string
    let query: string
    let mutation: object
    const now = new Date().toISOString()
    if (subjectId) {
      condition = '@if( eq(len(v), 1) AND eq(len(u), 1) )'
      query = `
          query v($creator: string, $subjectId: string) {
            # 创建者存在
            v(func: uid($creator)) @filter(type(User)) { v as uid }
            # 主题存在
            u(func: uid($subjectId)) @filter(type(Subject)) { u as uid }
          }
        `
      mutation = isAnonymous
        ? {
            uid: creator,
            posts: {
              uid: '_:post',
              'dgraph.type': 'Post',
              title,
              content,
              images,
              createdAt: now,
              // 帖子的创建者
              creator: {
                uid: creator,
                posts: {
                  uid: '_:post'
                }
              },
              // 帖子的匿名信息
              anonymous: {
                uid: '_:anonymous',
                'dgraph.type': 'Anonymous',
                creator: {
                  uid: creator
                },
                createdAt: now,
                to: {
                  uid: '_:post'
                }
              },
              // 帖子所属的主题
              subject: {
                uid: subjectId,
                posts: {
                  uid: '_:post'
                }
              }
            }
          }
        : {
            uid: creator,
            posts: {
              uid: '_:post',
              'dgraph.type': 'Post',
              title,
              content,
              images,
              createdAt: now,
              // 帖子的创建者
              creator: {
                uid: creator,
                posts: {
                  uid: '_:post'
                }
              },
              // 帖子所属的主题
              subject: {
                uid: subjectId,
                posts: {
                  uid: '_:post'
                }
              }
            }
          }
    } else {
      condition = '@if( eq(len(v), 1) )'
      query = `
        query {
          v(func: uid(${creator})) @filter(type(User)) { v as uid }
        }
      `
      mutation = isAnonymous
        ? {
            uid: creator,
            posts: {
              uid: '_:post',
              'dgraph.type': 'Post',
              title,
              content,
              images,
              createdAt: now,
              // 帖子的创建者
              creator: {
                uid: creator,
                posts: {
                  uid: '_:post'
                }
              },
              // 帖子的匿名信息
              anonymous: {
                uid: '_:annonymous',
                'dgraph.type': 'Anonymous',
                creator: {
                  uid: creator
                },
                to: {
                  uid: '_:post'
                },
                createdAt: now
              }
            }
          }
        : {
            uid: creator,
            posts: {
              uid: '_:post',
              'dgraph.type': 'Post',
              title,
              content,
              images,
              createdAt: now,
              // 帖子的创建者
              creator: {
                uid: creator,
                posts: {
                  uid: '_:post'
                }
              }
            }
          }
    }

    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      v: Array<{uid: string}>
      u: Array<{uid: string}>
    }>({
      mutations: [{ mutation, condition }],
      query,
      vars: {
        $creator: creator,
        $subjectId: subjectId
      }
    })

    if (res.json.v.length !== 1) {
      throw new ForbiddenException(`用户 ${creator} 不存在`)
    }
    if (subjectId && res.json.u.length !== 1) {
      throw new ForbiddenException(`主题 ${subjectId} 不存在`)
    }

    return {
      id: res.uids.get('post'),
      title,
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
    const res = await this.dbService.commitQuery<{post: Array<Nullable<{creator: Nullable<User>}>>}>({ query, vars: { $postId: id } })
    return res.post[0]?.creator
  }

  /**
   * 返回帖子的点赞 并计算当前浏览者是否点赞
   * @param viewerId 浏览者id
   * @param postId 帖子id
   * @returns { Promise<VotesConnection> }
   */
  async getVotesByPostId (viewerId: string, postId: string, first: number, offset: number): Promise<VotesConnection> {
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
