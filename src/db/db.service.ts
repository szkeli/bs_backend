import { ForbiddenException, Injectable } from '@nestjs/common'
import {
  DgraphClient,
  DgraphClientStub,
  Mutation,
  Operation,
  Request
} from 'dgraph-js'
import { readFileSync } from 'fs'

import { CommitConditionalUpertsProps, CommitConditionalUpsertWithVarsProps, CommitQueryWithVarsProps } from './model/db.model'
@Injectable()
export class DbService {
  private readonly dgraphStub: DgraphClientStub
  private readonly dgraph: DgraphClient
  constructor () {
    this.dgraphStub = new DgraphClientStub('api.szlikeyou.com:9080')
    this.dgraph = new DgraphClient(this.dgraphStub)
  }

  getDgraphIns () {
    return this.dgraph
  }

  async init () {}

  // testetstssssssssssssssssssssssssssssssssssss
  async dropAll () {
    const op = new Operation()
    op.setDropAll(true)
    await this.dgraph.alter(op)
  }

  async dropData () {
    const op = new Operation()
    op.setDropOp(Operation.DropOp.DATA)
    await this.dgraph.alter(op)
  }

  async setSchema () {
    const schema = readFileSync('src/db/db.schema', 'utf8').toString()

    const op = new Operation()
    op.setSchema(schema)
    const res = await this.dgraph.alter(op)
    // Payload {
    //   wrappers_: null,
    //   messageId_: undefined,
    //   arrayIndexOffset_: -1,
    //   array: [],
    //   pivot_: 1.7976931348623157e+308,
    //   convertedPrimitiveFields_: {}
    // }
    console.error(res)

    return res
  }

  async test () {
    await this.setSchema()
  }

  async commitQuery<T> ({ vars, query }: CommitQueryWithVarsProps): Promise<T> {
    if (!vars || Object.entries(vars).length === 0) {
      return (await this.dgraph
        .newTxn({ readOnly: true })
        .query(query))
        .getJson() as unknown as T
    } else {
      return (await this.dgraph
        .newTxn({ readOnly: true })
        .queryWithVars(query, vars))
        .getJson() as unknown as T
    }
  }

  async commitConditionalUperts<U, V> ({ mutations, query, vars }: CommitConditionalUpertsProps): Promise<{ uids: U, json: V}> {
    const txn = this.dgraph.newTxn()
    try {
      if (mutations.length === 0) {
        throw new ForbiddenException('变更不能为空')
      }
      const mus = mutations.map(m => {
        const mu = new Mutation()
        mu.setSetJson(m.mutation)
        mu.setCond(m.condition)
        return mu
      })

      const req = new Request()
      if (vars && Object.entries(vars).length !== 0) {
        const _vars = req.getVarsMap()
        Object.entries(vars).forEach(r => _vars.set(r[0], r[1]))
      }
      req.setQuery(query)
      req.setMutationsList(mus)
      req.setCommitNow(true)

      const res = await txn.doRequest(req)
      return {
        uids: res.getUidsMap() as unknown as U,
        json: res.getJson() as unknown as V
      }
    } finally {
      await txn.discard()
    }
  }

  async commitConditionalUpsertWithVars<T, V> ({ conditions, mutation, query, vars }: CommitConditionalUpsertWithVarsProps): Promise<{
    uids: T
    json: V
  }> {
    const txn = this.dgraph.newTxn()
    try {
      const mu = new Mutation()
      mu.setSetJson(mutation)
      mu.setCond(conditions)

      const req = new Request()
      if (vars && Object.entries(vars).length !== 0) {
        const _vars = req.getVarsMap()
        Object.entries(vars).forEach(r => {
          _vars.set(r[0], r[1])
        })
      }
      req.setQuery(query)
      req.addMutations(mu)
      req.setCommitNow(true)

      const res = await txn.doRequest(req)
      return {
        uids: res.getUidsMap() as unknown as T,
        json: res.getJson() as unknown as V
      }
    } finally {
      await txn.discard()
    }
  }
}
