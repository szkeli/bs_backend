import { Resolver } from '@nestjs/graphql'

import { Notification } from './models/notifications.model'
import { NotificationsService } from './notifications.service'

@Resolver(of => Notification)
export class NotificationsResolver {
  constructor (private readonly notificationsService: NotificationsService) {}
}
