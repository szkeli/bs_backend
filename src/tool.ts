import axios from "axios";


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