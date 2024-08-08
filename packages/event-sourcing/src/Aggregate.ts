import { Data } from "effect"
import type { Version } from "./Version.js"

export const TypeId: unique symbol = Symbol.for("@effect/event-sourcing/Aggregate")

export type TypeId = typeof TypeId

type AggregateFn<A extends Aggregate> = (...args: Array<any>) => A

/**
 * An aggregate class has two defining characteristics:
 * - It contains some state
 * - It defines some number of handlers that can be used to return a new aggregate with modified state
 */
export interface Aggregate {
  readonly [TypeId]: TypeId
  [key: string]: (...args: Array<any>) => Aggregate
}

Data.unsafeStruct({})

export class TestAggregate implements Aggregate {
  constructor(
    private readonly id: string,
    private readonly version: Version
  ) {}
    [key: string]: (...args: Array<any>) => Aggregate
    [TypeId]: typeof TypeId

  withVersion = (version: Version) => new TestAggregate(this.id, version)

  copy = () => {
    return ""
  }
}

export declare namespace Aggregate {
}
