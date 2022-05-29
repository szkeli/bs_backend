import { Injectable } from '@nestjs/common'

import { SubCampusAlreadyAtTheUniversityExxception, UniversityNotFoundException } from '../app.exception'
import { RelayPagingConfigArgs } from '../connections/models/connections.model'
import { DbService } from '../db/db.service'
import { now } from '../tool'
import { University } from '../universities/models/universities.models'
import { CreateSubCampusArgs, SubCampus } from './models/subcampus.model'

@Injectable()
export class SubcampusService {
  constructor (private readonly dbService: DbService) {}

  async university (id: string) {
    const query = `
        query v($id: string) {
            var(func: uid($id)) @filter(type(SubCampus)) {
                university as ~subcampus @filter(type(University))
            }
            university(func: uid(university)) {
                id: uid
                expand(_all_)
            }
        }
      `
    const res = await this.dbService.commitQuery<{
      university: University[]
    }>({
      query,
      vars: { $id: id }
    })

    return res.university[0]
  }

  async createSubCampus ({ id, name }: CreateSubCampusArgs): Promise<SubCampus> {
    const query = `
        query v($id: string, $name: string) {
            # 该学校是否存在
            u(func: uid($id)) @filter(type(University)) { u as uid }
            var(func: uid(u)) {
                subCampuses @filter(eq(name, $name)) {
                    v as uid
                }
            }
            v(func: uid(v)) { uid }
        }
      `
    const condition = '@if( eq(len(u), 1) and eq(len(v), 0) )'
    const mutation = {
      uid: 'uid(u)',
      subCampuses: {
        uid: '_:subcampuses',
        name,
        createdAt: now()
      }
    }
    const res = await this.dbService.commitConditionalUperts<Map<string, string>, {
      u: Array<{uid: string}>
      v: Array<{uid: string}>
    }>({
      query,
      mutations: [{ mutation, condition }],
      vars: { $id: id, $name: name }
    })

    if (res.json.u.length !== 1) {
      throw new UniversityNotFoundException(id)
    }

    if (res.json.v.length !== 0) {
      throw new SubCampusAlreadyAtTheUniversityExxception(id, name)
    }

    return {
      id: res.uids.get('_:subcampuses'),
      name,
      createdAt: now()
    }
  }

  async subcampuses (args: RelayPagingConfigArgs) {
    throw new Error('Method not implemented.')
  }

  async subcampus (id: string) {
    throw new Error('Method not implemented.')
  }
}
