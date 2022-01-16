import { Injectable } from '@nestjs/common'

@Injectable()
export class ReportsService {
  async addReportOnUser (id: string, commentId: string) {
    throw new Error('Method not implemented.')
  }

  async addReportOnPost (id: string, postId: string) {
    throw new Error('Method not implemented.')
  }

  async addReportOnComment (id: string, userId: string) {
    throw new Error('Method not implemented.')
  }
}
