import { Data, Equal, Hash, Inspectable, pipe, PrimaryKey } from "effect"
import type { EventStream } from "./EventStream.js"
import * as Version from "./Version.js"

export interface Event<ES extends EventStream.Any> extends Equal.Equal, PrimaryKey.PrimaryKey, Inspectable.Inspectable {
  readonly [TypeId]: TypeId
  readonly streamId: EventStream.StreamId<ES>
  readonly version: Version.Version
  readonly payload: EventStream.Payload<ES>
  readonly timestamp: Date
}

export declare namespace Event {
  export type Any<ES extends EventStream.Any = EventStream.Any> = Event<ES>
}

const SymbolKey = "@jpowersdev/event-sourcing/Event"

export const TypeId: unique symbol = Symbol.for(SymbolKey)

export type TypeId = typeof TypeId

export const Proto = Data.unsafeStruct({
  streamId: undefined,
  version: Version.first,
  payload: undefined,
  timestamp: new Date(),
  [TypeId]: TypeId,
  [PrimaryKey.symbol](this: Event<any>) {
    return `Event:${this.streamId}:${this.version}`
  },
  [Hash.symbol](this: Event<any>) {
    return pipe(
      Hash.hash(SymbolKey),
      Hash.combine(Hash.hash(this.version.version)),
      Hash.combine(Hash.hash(this.streamId as string)),
      Hash.cached(this)
    )
  },
  [Equal.symbol](that: Event<any>) {
    return Equal.equals(
      PrimaryKey.value(this),
      PrimaryKey.value(that)
    )
  },
  ...Inspectable.BaseProto,
  toJSON(this: Event<any>) {
    return {
      _id: "@jpowersdev/event-sourcing/Event",
      streamId: this.streamId,
      version: this.version,
      payload: this.payload,
      timestamp: this.timestamp
    }
  }
}) as Event.Any

export const make = <ES extends EventStream.Any>(
  streamId: EventStream.StreamId<ES>,
  version: Version.Version,
  payload: EventStream.Payload<ES>,
  timestamp: number
): Event<ES> => {
  const event = Object.create(Proto)
  event.streamId = streamId
  event.version = version
  event.payload = payload
  event.timestamp = timestamp
  return event
}
