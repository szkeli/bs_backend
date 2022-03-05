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
    this.dgraphStub = new DgraphClientStub(process.env.BACKEND)
    this.dgraph = new DgraphClient(this.dgraphStub)
  }

  getDgraphIns () {
    return this.dgraph
  }

  async init () {}

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
    return res
  }

  async commitConditionalDeletions<U, V> ({ mutations, query, vars }: CommitConditionalUpertsProps) {
    const txn = this.dgraph.newTxn()
    try {
      if (mutations.length === 0) {
        throw new ForbiddenException('变更不能为空')
      }
      const mus = mutations.map(m => {
        const mu = new Mutation()
        mu.setDeleteJson(m.mutation)
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

  async commitQuery<T> ({ vars, query }: CommitQueryWithVarsProps): Promise<T> {
    const txn = this.dgraph.newTxn({ readOnly: true })
    try {
      if (!vars || Object.entries(vars).length === 0) {
        return (await txn.query(query)).getJson() as unknown as T
      } else {
        return (await txn.queryWithVars(query, vars)).getJson() as unknown as T
      }
    } finally {
      await txn.discard()
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
