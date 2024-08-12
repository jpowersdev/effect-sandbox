import type { Serializable } from "@effect/schema"
import type { Streamable } from "effect"
import { Chunk, Data, pipe, Predicate, Stream } from "effect"
import { pipeArguments } from "effect/Pipeable"
import * as Event from "./Event.js"
import * as Version from "./Version.js"

export type EventStreams<StreamId, Payload> = Stream.Stream<{
  streamId: StreamId
  payload: Payload
}>

export const SymbolKey = "@jpowersdev/event-sourcing/EventStream"

export const TypeId: unique symbol = Symbol.for(SymbolKey)

export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface EventStream<StreamId, Payload> extends Streamable.Class<Payload> {
  readonly [TypeId]: TypeId
  readonly streamId: StreamId
  readonly events: Chunk.Chunk<Payload>
}

const streamVariance = {
  /* c8 ignore next */
  _R: (_: never) => _,
  /* c8 ignore next */
  _E: (_: never) => _,
  /* c8 ignore next */
  _A: (_: never) => _
}

export const Proto = Data.unsafeStruct({
  [TypeId]: TypeId,
  [Stream.StreamTypeId]: streamVariance,
  streamId: undefined,
  events: Chunk.empty<any>(),
  toStream() {
    return Stream.fromChunk(this.events)
  },
  pipe(this: EventStream<any, any>) {
    return pipeArguments(this, arguments)
  }
}) as EventStream.Any

export declare namespace EventStream {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Any = EventStream<any, any>

  /**
   * @since 1.0.0
   * @category models
   */
  export type StreamId<ES> = ES extends EventStream<infer StreamId, any> ? StreamId : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Payload<ES> = ES extends EventStream<any, infer Payload> ? Payload : never
}

export const toEventStream = <ES extends EventStream.Any>(
  events: Chunk.Chunk<EventStream.Payload<ES>>,
  streamId: EventStream.StreamId<ES>,
  lastVersion: Version.Version,
  timestamp: number
): ES => {
  const versions = pipe(
    Chunk.range(lastVersion.next, events.length),
    Chunk.map(Version.make)
  )

  const e = pipe(
    Chunk.zip(versions, events),
    Chunk.map(([version, payload]) => Event.make<ES>(streamId, version, payload, timestamp)),
    Chunk.map((_) => ({ streamId, payload: _.payload }))
  )

  return e as ES
}

export const isEventStream = (u: unknown): u is EventStream.Any =>
  Predicate.isObject(u) && Predicate.hasProperty(u, TypeId)
