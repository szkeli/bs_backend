import axios from "axios";
import * as crypto from 'crypto';

export async function exec<T, U>(l: string, bindings: object, aliases?: object){
  return axios.post<T>("http://w3.onism.cc:8084/gremlin", {
    gremlin: l,
    bindings,
    language: "gremlin-groovy",
    aliases: aliases || {
      "graph": "hugegraph",
      "g": "hugegraph",
    },
  }).then<U>(data => data.data as unknown as U);
}

export function hash(content: string) {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}