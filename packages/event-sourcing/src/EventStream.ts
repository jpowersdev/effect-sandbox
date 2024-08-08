import type { Serializable } from "@effect/schema"
import { ParseResult, Schema } from "@effect/schema"
import { Array, Chunk, Data, pipe, Predicate, Stream, Streamable } from "effect"
import { pipeArguments } from "effect/Pipeable"
import * as Event from "./Event.js"
import * as Version from "./Version.js"

export type EventStreams<StreamId, Payload> = Stream.Stream<{
  streamId: StreamId
  payload: Payload
}>

export const SymbolKey = "@effect/event-sourcing/EventStream"

export const TypeId: unique symbol = Symbol.for(SymbolKey)

export type TypeId = typeof TypeId

export declare namespace EventStream {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto<StreamId, Payload> {
    readonly [TypeId]: TypeId
    readonly events: Chunk.Chunk<Event<StreamId, Payload>>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Encoded<StreamId, Payload> {
    readonly events: ReadonlyArray<Event<StreamId, Payload>>
  }

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

  /**
   * @since 1.0.0
   * @category models
   */
  export type Event<StreamId, Payload> = { streamId: StreamId; payload: Payload }
}

export interface EventStream<StreamId, Payload>
  extends
    Streamable.Class<{ streamId: StreamId; payload: Payload }>,
    Serializable.Serializable<
      EventStream.Proto<StreamId, Payload>,
      EventStream.Encoded<StreamId, Payload>,
      never
    >
{
  [TypeId]: TypeId
  events: Chunk.Chunk<EventStream.Event<StreamId, Payload>>
}

const Proto = Data.unsafeStruct({
  events: Chunk.empty(),
  [TypeId]: TypeId,
  ...Streamable.Class,
  toStream() {
    return Stream.fromChunk(this.events)
  }
})

export const make = <StreamId, Payload>(
  events: ReadonlyArray<EventStream.Event<StreamId, Payload>>
): EventStream<StreamId, Payload> => {
  const eventStream = Object.create(Proto)
  eventStream.events = Chunk.make(events)
  return eventStream
}

export const toEventStream = <ES extends EventStream.Any>(
  self: Chunk.Chunk<EventStream.Payload<ES>>,
  streamId: EventStream.StreamId<ES>,
  lastVersion: Version.Version,
  timestamp: number
): ES =>
  self.pipe(
    Chunk.zip(
      pipe(
        Chunk.range(lastVersion.next, self.length),
        Chunk.map(Version.make)
      )
    ),
    Chunk.map(([payload, version]) =>
      Event.make(
        streamId,
        version,
        payload,
        timestamp
      )
    ),
    make<ES>
  )

const isEventStream = (u: unknown): u is EventStream.Any => Predicate.isObject(u) && Predicate.hasProperty(u, TypeId)

const parse = <
  StreamId,
  Payload,
  R
>(
  decodeUnknown: ParseResult.DecodeUnknown<
    EventStream.Encoded<StreamId, Payload>,
    R
  >
): ParseResult.DeclarationDecodeUnknown<EventStream<StreamId, Payload>, R> =>
(u, options, ast) =>
  isEventStream(u) ?
    ParseResult.mapBoth(decodeUnknown(u, options), {
      onFailure: (e) => new ParseResult.Composite(ast, u, e),
      onSuccess: (e) => make(e.events)
    })
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @since 1.0.0
 * @category schemas
 */
export interface EventStream$<
  StreamId,
  Payload
> extends
  Schema.AnnotableClass<
    EventStream$<StreamId, Payload>,
    EventStream<StreamId, Payload>,
    EventStream.Encoded<StreamId, Payload>,
    never
  >
{}

/**
 * @since 1.0.0
 * @category models
 */
export interface EventStreamFromSelf<
  StreamId,
  Payload
> extends
  Schema.AnnotableClass<
    EventStreamFromSelf<StreamId, Payload>,
    EventStream.Proto<StreamId, Payload>,
    EventStream.Proto<StreamId, Payload>,
    never
  >
{}

const EventStream$ = Schema.Struct({
  events: Schema.Array(Schema.Struct({
    streamId: Schema.Any,
    payload: Schema.Any
  }))
})

const EventStreamFromSelf = <
  StreamId,
  Payload
>(
  events: Schema.Schema<Chunk.Chunk<EventStream.Event<StreamId, Payload>>>
): EventStreamFromSelf<StreamId, Payload> => {
  return Schema.declare(
    [events],
    {
      decode: () => parse(ParseResult.decodeUnknown(EventStream$)),
      encode: () => parse(ParseResult.encodeUnknown(EventStream$))
    },
    {}
  )
}
