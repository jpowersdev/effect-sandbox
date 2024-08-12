import * as Schema from "@effect/schema/Schema"
import { Data, Equal, Hash, Inspectable, Predicate } from "effect"
import { pipe } from "effect/Function"
import * as Stream from "effect/Stream"

const VersionSymbolKey = "@jpowersdev/event-sourcing/Version"

export const TypeId: unique symbol = Symbol.for(VersionSymbolKey)

export type TypeId = typeof TypeId

export const schema = Schema.Int.annotations({
  description: "A version number",
  jsonSchema: {
    minimum: 0,
    exclusiveMinimum: true
  }
})

export interface Version extends Inspectable.Inspectable, Equal.Equal {
  readonly [TypeId]: TypeId
  version: number
  isFirst(): boolean
  get next(): number
  get nextVersion(): Version
  get nextVersions(): Stream.Stream<Version>
}

/**
 * @category type guards
 */
export const isVersion = (value: unknown): value is Version => Predicate.isTagged(value, VersionSymbolKey)

/**
 * @category constructors
 */
export const Proto: Version = Data.unsafeStruct({
  [TypeId]: TypeId,
  ...Inspectable.BaseProto,
  [Inspectable.NodeInspectSymbol](this: Version) {
    return `Version(${this.version})`
  },
  toJSON(this: Version) {
    return {
      _id: "@jpowersdev/event-sourcing/Version",
      version: this.version
    }
  },
  [Hash.symbol](): number {
    return pipe(
      Hash.string(VersionSymbolKey),
      Hash.combine(Hash.number(this.version))
    )
  },
  [Equal.symbol](this: Version, that: Version): boolean {
    return this.version === that.version
  },
  version: 0,
  isFirst(): boolean {
    return this === first
  },
  get next(): number {
    return this.version + 1
  },
  get nextVersion(): Version {
    return make(this.next)
  },
  get nextVersions(): Stream.Stream<Version> {
    return pipe(
      Stream.range(this.next, Infinity),
      Stream.map((version) => make(version))
    )
  }
})

/**
 * @category constructors
 */
export const make = (version: number): Version => {
  const model = Object.create(Proto)
  model.version = version
  return model
}

export const first = make(0)
