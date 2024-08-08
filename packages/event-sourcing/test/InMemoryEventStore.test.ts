import * as InMemoryEventStore from "@effect/event-sourcing/InMemoryEventStore"
import { Schema } from "@effect/schema"
import * as it from "@effect/vitest"
import {
  Cause,
  Chunk,
  Data,
  Duration,
  Effect,
  Equal,
  Exit,
  Fiber,
  Layer,
  Logger,
  LogLevel,
  Option,
  pipe,
  Predicate,
  Schedule,
  Stream
} from "effect"
import * as assert from "node:assert"
import type { EventStream } from "../src/EventStream.js"
import * as Version from "../src/Version.js"

type TestPayload = {
  _tag: "TestEvent"
  value: number
}

const TestPayload = Data.tagged<TestPayload>("TestEvent")

type TestEventStream = EventStream<string, TestPayload>

it.describe("InMemoryEventStore", () => {
  const payload = pipe(
    Chunk.range(1, 10),
    Chunk.map((value) => TestPayload({ value }))
  )

  it.effect("should persist events", () =>
    Effect.gen(function*() {
      // Test goes here
      const store = yield* InMemoryEventStore.make<TestEventStream>()
      const streamId = "test"

      const chunk = yield* store.persist(
        streamId,
        payload,
        Option.none()
      )

      // Persisted should contain a single event
      yield* Effect.try(() => {
        it.expect(chunk.length).toBe(payload.length)
      })
    }))

  it.effect("should read events", () =>
    Effect.gen(function*() {
      const store = yield* InMemoryEventStore.make<TestEventStream>()
      const streamId = "test"

      yield* store.persist(
        streamId,
        payload,
        Option.none()
      )

      const chunk = yield* store.read(streamId, Version.first, 10)

      yield* Effect.try(() => {
        it.expect(chunk.length).toBe(payload.length)
      })
    }))

  it.effect("should handle multiple persists", () =>
    Effect.gen(function*() {
      const store = yield* InMemoryEventStore.make<TestEventStream>()
      const streamId = "test"

      yield* store.persist(
        streamId,
        Chunk.make(TestPayload({ value: 1 })),
        Option.none()
      )

      yield* store.persist(
        streamId,
        Chunk.make(TestPayload({ value: 2 })),
        Option.none()
      )

      const chunk = yield* store.read(streamId, Version.first, 10)

      yield* Effect.try(() => {
        it.expect(chunk.length).toBe(2)
      })
    }))

  it.effect("should handle concurrent persists from forked threads", () =>
    Effect.gen(function*() {
      const store = yield* InMemoryEventStore.make<TestEventStream>()

      const streamId = "test"

      const fibers = payload.pipe(
        Chunk.map((event) =>
          pipe(
            store.persist(streamId, Chunk.of(event), Option.none()),
            Effect.fork
          )
        )
      )

      const persisted = yield* Effect.all(
        fibers,
        {
          concurrency: "unbounded"
        }
      )

      yield* Fiber.joinAll(persisted)

      const chunk = yield* store.read(streamId, Version.first, 10)

      yield* Effect.try(() => {
        it.expect(chunk.length).toBe(payload.length)
      })
    }), 10000)

  it.effect("should read events from a specific version", () =>
    Effect.gen(function*() {
      const store = yield* InMemoryEventStore.make<TestEventStream>()
      const streamId = "test"

      yield* store.persist(
        streamId,
        payload,
        Option.none()
      )

      const version = Version.make(5)
      const chunk = yield* store.read(streamId, Version.make(5), 10)

      yield* Effect.try(() => {
        it.expect(chunk.length).toBe(
          payload.length - (version.version - 1)
        )
      })
    }))

  it.effect("should fail to persist events with wrong expected version", () =>
    Effect.gen(function*() {
      const store = yield* InMemoryEventStore.make<TestEventStream>()
      const streamId = "test"

      const exit = yield* pipe(
        store.persist(
          streamId,
          Chunk.make(TestPayload({ value: 1 })),
          Option.some(Version.make(2))
        ),
        Effect.exit
      )

      assert.ok(Exit.isFailure(exit))
      assert.ok(Cause.isFailType(exit.cause))
      assert.ok(Predicate.isTagged(
        exit.cause.error,
        "ConcurrentModificationException"
      ))
    }))
})
