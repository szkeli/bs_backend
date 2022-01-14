import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'

async function bootstrap () {
  // user a following user b
  // let doit = `
  //   a = hugegraph.traversal().V().has('name','famouscat').as('person')
  //   b = g.traversal().V().has('name', 'haha').as('person')
  //   g.traversal().addE('follow').from(a).to(b)
  // `;

  // user a created a post c
  // let doit = `
  //   a = hugegraph.traversal().V().has('name','famouscat').as('person')
  //   b = g.traversal().V(538376657266802688)
  //   g.traversal().addE('created').from(a).to(b)
  // `;

  // user d add a comment to the post c
  // let doit = `
  //   // get the user d
  //   user_d = g.traversal().V(538367913183150080)
  //   // the post c
  //   post_c = g.traversal().V(538376657266802688)

  //   // user d created a comment c
  //   g.traversal()
  //     .V(538399748386717696)
  //     .addE('owned')
  //     .to(post_c)
  // `;
  // let doit = `
  //   g.traversal().addV('person').property('name', 'haha')
  // `;

  // add some users
  // let doit = `
  //   g.traversal().addV('person').property('name', '小宝测试').property('age', 20)

  // `;

  // let doit = `
  //   user_a = g.traversal().V(538407723369234444)

  //   // created and posted a post
  //   g.traversal()
  //     .addV('post')
  //     .property('content', '帖子内容测试 内容测试 内容 富文本 文本 纯文本 test for contenting......')
  //     .addE('created_post')
  //     .from(user_a)
  // `;

  // let a = await axios.post("http://127.0.0.1:8080/gremlin", {
  //   gremlin: doit,
  //   bindings: {},
  //   language: "gremlin-groovy",
  //   aliases: {
  //     "graph": "hugegraph",
  //     "g": "hugegraph",
  //   },
  // }).then((data) => data.data)
  //   .catch((e) => {
  //     console.error(pretty.render(e));
  //   });
  // console.error(pretty.render(a));
  const app = await NestFactory.create(AppModule)
  await app.listen(3001)
}

bootstrap().then(r => {

}).catch(e => {
  throw e
})
