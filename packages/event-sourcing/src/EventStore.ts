import type { Chunk, Effect, Option } from "effect"
import type { EventStream } from "./EventStream.js"
import type { ConcurrentModificationException } from "./InMemoryEventStore.js"
import type { Version } from "./Version.js"

export interface EventStore<A, ES extends EventStream.Any> extends EventStreamReader<A, ES>, EventStreamWriter<A, ES> {
}

export interface EventStreamReader<
  A,
  ES extends EventStream.Any
> {
  read: (
    streamId: EventStream.StreamId<ES>,
    fromVersion: Version,
    maxCount: number
  ) => Effect.Effect<A>
}

export interface EventStreamWriter<
  A,
  ES extends EventStream.Any
> {
  persist: (
    streamId: EventStream.StreamId<ES>,
    events: Chunk.Chunk<
      EventStream.Payload<ES>
    >,
    expectedVersion: Option.Option<Version>
  ) => Effect.Effect<A, ConcurrentModificationException>
}
