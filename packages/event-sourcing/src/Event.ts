import { Data, Equal, PrimaryKey } from "effect"
import type { EventStream } from "./EventStream.js"
import type { Version } from "./Version.js"

export type Event<ES> = ES extends EventStream<infer StreamId, infer Payload> ?
    & {
      streamId: StreamId
      version: Version
      payload: Payload
      timestamp: Date
    }
    & Equal.Equal
    & PrimaryKey.PrimaryKey :
  never

export const TypeId: unique symbol = Symbol.for("@effect/event-sourcing/Event")

export type TypeId = typeof TypeId

export const Proto = Data.unsafeStruct({
  entry: undefined,
  [TypeId]: TypeId,
  [PrimaryKey.symbol](this: Event<any>) {
    return `Event:${this.streamId}:${this.version}`
  },
  [Equal.symbol](that: Event<any>) {
    return Equal.equals(
      PrimaryKey.value(this),
      PrimaryKey.value(that)
    )
  }
})

export const make = <ES extends EventStream.Any>(
  streamId: EventStream.StreamId<ES>,
  version: Version,
  payload: EventStream.Payload<ES>,
  timestamp: number
) => {
  const event = Object.create(Proto)
  event.streamId = streamId
  event.version = version
  event.payload = payload
  event.timestamp = timestamp
  return event
}
