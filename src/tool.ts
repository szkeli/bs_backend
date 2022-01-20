import axios from 'axios'
import * as crypto from 'crypto'

export async function exec<T, U> (l: string, bindings: object, aliases?: object) {
  return await axios.post<T>('http://w3.onism.cc:8084/gremlin', {
    gremlin: l,
    bindings,
    language: 'gremlin-groovy',
    aliases: aliases || {
      graph: 'hugegraph',
      g: 'hugegraph'
    }
  }).then<U>(data => data.data as unknown as U)
}

export function hash (content: any) {
  const v = `${JSON.stringify(content)}:${Date.now()}`
  const h = crypto.createHash('sha256')
  h.update(v)
  return h.digest('hex')
}

export function sign (s: string) {
  const h1 = crypto.createHash('sha512')
    .update(s)
    .digest('hex')
  const h2 = crypto.createHash('sha512')
    .update(h1)
    .digest('hex')
  return h2
}

export function uuid () {
  const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
  return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4())
}
