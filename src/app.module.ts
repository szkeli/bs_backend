import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { GraphQLModule } from '@nestjs/graphql'
import { join } from 'path'

import { AdminModule } from './admin/admin.module'
import { AnonymousModule } from './anonymous/anonymous.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { RoleAuthGuard } from './auth/auth.guard'
import { AuthModule } from './auth/auth.module'
import { BlocksModule } from './blocks/blocks.module'
import { CaslModule } from './casl/casl.module'
import { CensorsModule } from './censors/censors.module'
import { CensorsService } from './censors/censors.service'
import { CommentModule } from './comment/comment.module'
import { CommentService } from './comment/comment.service'
import { ConnectionsModule } from './connections/connections.module'
import { ConversationsModule } from './conversations/conversations.module'
import { CosModule } from './cos/cos.module'
import { CredentialsModule } from './credentials/credentials.module'
import { CurriculumsModule } from './curriculums/curriculums.module'
import { DbModule } from './db/db.module'
import { DbService } from './db/db.service'
import { DeadlinesModule } from './deadlines/deadlines.module'
import { DeletesModule } from './deletes/deletes.module'
import { FoldsModule } from './folds/folds.module'
import { MessagesModule } from './messages/messages.module'
import { NlpModule } from './nlp/nlp.module'
import { NodeModule } from './node/node.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PinsModule } from './pins/pins.module'
import { PostsModule } from './posts/posts.module'
import { PostsService } from './posts/posts.service'
import { PrivilegesModule } from './privileges/privileges.module'
import { PubsubsModule } from './pubsubs/pubsubs.module'
import { ReportsModule } from './reports/reports.module'
import { SearchModule } from './search/search.module'
import { SharedModule } from './shared/shared.module'
import { StsModule } from './sts/sts.module'
import { SubjectModule } from './subject/subject.module'
import { UserModule } from './user/user.module'
import { UserService } from './user/user.service'
import { ViewsModule } from './views/views.module'
import { VotesModule } from './votes/votes.module'
import { WxModule } from './wx/wx.module'
import { RolesModule } from './roles/roles.module';

@Module({
  imports: [
    GraphQLModule.forRoot({
      installSubscriptionHandlers: true,
      subscriptions: {
        'subscriptions-transport-ws': {
          onConnect: (connectionParams: Record<string, any>, webSocket: WebSocket & { upgradeReq: Request }) => {
            // @ts-expect-error
            webSocket.upgradeReq.headers = {
              ...webSocket.upgradeReq.headers,
              ...connectionParams.headers ?? {}
            }
            return { req: webSocket.upgradeReq }
          },
          keepAlive: 5000
        }
      },
      context: ({ req }) => ({ req }),
      debug: true,
      playground: true,
      sortSchema: false,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql')
    }),
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PostsModule,
    UserModule,
    CommentModule,
    VotesModule,
    AdminModule,
    AuthModule,
    SharedModule,
    SubjectModule,
    SearchModule,
    NodeModule,
    ReportsModule,
    MessagesModule,
    ConversationsModule,
    DbModule,
    DeletesModule,
    StsModule,
    CaslModule,
    PrivilegesModule,
    DeadlinesModule,
    ViewsModule,
    CurriculumsModule,
    FoldsModule,
    BlocksModule,
    CredentialsModule,
    PinsModule,
    CensorsModule,
    PubsubsModule,
    ConnectionsModule,
    AnonymousModule,
    NotificationsModule,
    WxModule,
    CosModule,
    NlpModule,
    RolesModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PostsService,
    DbService,
    CommentService,
    UserService,
    CensorsService,
    {
      provide: APP_GUARD,
      useClass: RoleAuthGuard
    }
  ]
})
export class AppModule {}
