import {
	Arg,
	Field,
	ObjectType,
	Query,
	Mutation,
	Resolver
} from 'type-graphql'
import type { EntityManager } from 'typeorm'
import { UserComment } from '../model/generated'

@ObjectType()
export class UserCommentCountQueryResult {
	@Field(() => Number, { nullable: false })
	total!: number

	constructor(props: Partial<UserCommentCountQueryResult>) {
		Object.assign(this, props);
	}
}

@Resolver()
export class UserCommentResolver {
	constructor(private tx: () => Promise<EntityManager>) {}

	@Query(() => [UserCommentCountQueryResult])
	async countUserComments(): Promise<UserCommentCountQueryResult[]> {
		const manager = await this.tx()
		const result: UserCommentCountQueryResult[] = await manager.getRepository(UserComment).query(`SELECT COUNT(id) as total FROM user_comment`)
		return result
	}

	@Mutation(() => Boolean)
	async addComment(@Arg('text') comment: string): Promise<Boolean> {
		let manager = await this.tx()
		let user = 'anonymous'
		await manager.save(new UserComment({
			id: `${user}-${comment}`,
			user,
			comment
		}))
		return true
	}
}
