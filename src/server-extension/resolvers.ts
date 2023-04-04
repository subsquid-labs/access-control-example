import { Arg, Field, ObjectType, Query, Resolver } from 'type-graphql'
import type { EntityManager } from 'typeorm'
import { LiquidationEvent } from '../model/generated'

@ObjectType()
export class LiquidationEventQueryResult {
  @Field(() => Number, { nullable: false })
  total!: number

  constructor(props: Partial<LiquidationEventQueryResult>) {
    Object.assign(this, props);
  }
}

@Resolver()
export class MyResolver {
  // Set by depenency injection
  constructor(private tx: () => Promise<EntityManager>) {}

  @Query(() => [LiquidationEventQueryResult])
  async myQuery(): Promise<LiquidationEventQueryResult[]> {
    const manager = await this.tx()
    // execute custom SQL query
    const result: LiquidationEventQueryResult[] = await manager.getRepository(LiquidationEvent).query(
      `SELECT 
        COUNT(id) as total 
      FROM liquidation_event`)
    return result
  }
}
