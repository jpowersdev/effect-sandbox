import { Schema } from "@effect/schema"
import { Chunk, Context, Effect, Equal, flow, Number, Option, pipe, STM, TMap } from "effect"
import type { Event } from "./Event.js"
import type { EventStore } from "./EventStore.js"
import { type EventStream, toEventStream } from "./EventStream.js"
import * as Version from "./Version.js"

export class ConcurrentModificationException
  extends Schema.TaggedError<ConcurrentModificationException>()("ConcurrentModificationException", {
    cause: Schema.Unknown
  })
{
}

export interface InMemoryEventStore<ES extends EventStream.Any> extends EventStore<ES> {
}

export const InMemoryEventStore = <ES extends EventStream.Any>() =>
  Context.GenericTag<InMemoryEventStore<ES>>(
    "@jpowersdev/event-sourcing/InMemoryEventStore"
  )

export const make = <ES extends EventStream.Any>(): Effect.Effect<
  InMemoryEventStore<ES>
> =>
  Effect.gen(function*() {
    const store = yield* TMap.make<
      EventStream.StreamId<ES>,
      ES
    >()

    const lastVersionFor = (
      streamId: EventStream.StreamId<ES>,
      expectedVersion: Option.Option<Version.Version>
    ): STM.STM<Version.Version, ConcurrentModificationException> =>
      STM.gen(function*() {
        const lastEvent = STM.map(
          readStream(streamId),
          Chunk.last
        )

        const lastVersion = yield* STM.map(
          lastEvent,
          flow(
            Option.map((event) => event.version),
            Option.getOrElse(() => Version.first)
          )
        )

        if (Option.isSome(expectedVersion)) {
          if (!Equal.equals(expectedVersion.value, lastVersion)) {
            yield* STM.fail(
              new ConcurrentModificationException({
                cause: `Expected ${expectedVersion.value}, but found ${lastVersion}`
              })
            )
          }
        }

        return lastVersion
      })

    const persist = (
      streamId: EventStream.StreamId<ES>,
      events: ES,
      expectedVersion: Option.Option<Version.Version>
    ): Effect.Effect<ES, ConcurrentModificationException> =>
      STM.gen(function*() {
        const lastVersion = yield* lastVersionFor(streamId, expectedVersion)
        const now = Date.now()

        yield* pipe(
          TMap.updateWith(
            store,
            streamId,
            Option.match({
              onSome: (current) =>
                Option.some(
                  Chunk.appendAll(current, events)
                ),
              onNone: () => Option.some(events)
            })
          )
        )

        const nextEvents = toEventStream(events, streamId, lastVersion, now)

        return yield* STM.succeed(nextEvents)
      }).pipe(
        STM.commit,
        Effect.withSpan("InMemoryEventStore.persist")
      )

    const readStream = (streamId: EventStream.StreamId<ES>): STM.STM<ES> =>
      TMap.getOrElse(store, streamId, () => Chunk.empty<Event<ES>>())

    const read = (
      streamId: EventStream.StreamId<ES>,
      fromVersion: Version.Version,
      maxCount: number
    ): Effect.Effect<ES> =>
      pipe(
        Number.max(fromVersion.version - 1, 0),
        (startIndex) =>
          Effect.map(
            readStream(streamId),
            flow(
              Chunk.drop(startIndex),
              Chunk.take(maxCount)
            )
          ),
        Effect.withSpan("InMemoryEventStore.read")
      )

    return InMemoryEventStore<ES>().of({ read, persist })
  })
