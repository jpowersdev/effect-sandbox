import type { Chunk, Effect, Option } from "effect"
import type { EventStream } from "./EventStream.js"
import type { ConcurrentModificationException } from "./InMemoryEventStore.js"
import type { Version } from "./Version.js"

export interface EventStore<ES extends EventStream.Any> extends EventStreamReader<ES>, EventStreamWriter<ES> {
}

export interface EventStreamReader<
  ES extends EventStream.Any
> {
  read: (
    streamId: EventStream.StreamId<ES>,
    fromVersion: Version,
    maxCount: number
  ) => Effect.Effect<ES>
}

export interface EventStreamWriter<
  ES extends EventStream.Any
> {
  persist: (
    streamId: EventStream.StreamId<ES>,
    events: Chunk.Chunk<
      EventStream.Payload<ES>
    >,
    expectedVersion: Option.Option<Version>
  ) => Effect.Effect<ES, ConcurrentModificationException>
}
