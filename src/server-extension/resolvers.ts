import {
	Arg,
	Field,
	ObjectType,
	Query,
	Mutation,
	Resolver,
	Ctx
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
	async countUserComments(
		@Ctx() ctx: any
	): Promise<UserCommentCountQueryResult[]> {
		let user = ctx.openreader.user
		let manager = await this.tx()
		let result: UserCommentCountQueryResult[] =
			await manager
				.getRepository(UserComment)
				.query(`
					SELECT COUNT(*) as total
					FROM user_comment
					WHERE "user" = '${user}'
				`)
		return result
	}

	@Mutation(() => Boolean)
	async addComment(
		@Arg('text') comment: string,
		@Ctx() ctx: any
	): Promise<Boolean> {
		let user = ctx.openreader.user
		let manager = await this.tx()
		await manager.save(new UserComment({
			id: `${user}-${comment}`,
			user,
			comment
		}))
		return true
	}
}
