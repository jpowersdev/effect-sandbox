import * as Version from "@jpowersdev/event-sourcing/Version"
import * as it from "@effect/vitest"
import { Effect, Equal, Stream } from "effect"
import * as assert from "node:assert"

it.it("should create a new version", () => {
  const initial = Version.make(0)
  assert.ok(Equal.equals(initial.next, 1))
  assert.ok(Equal.equals(initial.nextVersion.version, 1))
})

it.effect("should create a stream of versions", () =>
  Effect.gen(function*() {
    const initial = Version.make(0)
    const stream = initial.nextVersions

    let version = 1

    yield* stream.pipe(
      Stream.take(3),
      Stream.map((v) => assert.equal(v.version, version++)),
      Stream.runDrain
    )
  }))
