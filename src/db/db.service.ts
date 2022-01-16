import { Injectable } from '@nestjs/common'
import {
  DgraphClient,
  DgraphClientStub,
  Operation
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
  async dropAll (q: DgraphClient) {
    const op = new Operation()
    op.setDropAll(true)
    await q.alter(op)
  }

  async dropData (q: DgraphClient) {
    const op = new Operation()
    op.setDropOp(Operation.DropOp.DATA)
    await q.alter(op)
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

  // teststsssssssssssssssssssssssssssssssssssssssssssssssssss
}
