import { Injectable } from '@nestjs/common'
import {
  DgraphClient,
  DgraphClientStub,
  Mutation,
  Operation,
  Request
} from 'dgraph-js'
import { readFileSync } from 'fs'
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

    console.error(schema)
    const op = new Operation()
    op.setSchema(schema)
    const res = await this.dgraph.alter(op)
    console.error(res)
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

export interface CommitConditionalUpsertWithVarsProps {
  conditions: string
  mutation: object
  query: string
  vars: Vars
}
export interface CommitQueryWithVarsProps {
  query: string
  vars?: Vars
}

export interface Vars {
  [key: string]: string
}
