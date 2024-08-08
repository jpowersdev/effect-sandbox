import * as Schema from "@effect/schema/Schema"
import type { Stream } from "effect"
import * as Data from "effect/Data"
import * as Equal from "effect/Equal"
import * as PrimaryKey from "effect/PrimaryKey"
import { Version } from "./Version.js"

export interface Aggregate {
  id: string
  version: Version
}


export type AggregateReducer<P extends Protocol<StreamId, Payload>> = Reducer<
  P["aggregate"],
  P["eventStream"]["payload"]
>

interface Protocol<StreamId, Payload> {
  eventStream: EventStream<StreamId, Payload>
  aggregate: Aggregate
}




// const Event_ = {
//   EventStreamOps: <ES extends EventStream>(payloads: Stream.Stream<ES["Payload"]>) => ({
//     toEventStream: (
//       streamId: ES["Id"],
//       lastVersion: Version,
//       timestamp: Date
//     ): Stream.Stream<Event<ES>> =>
//       pipe(
//         Stream.zip(
//           lastVersion.nextVersions,
//           payloads
//         ),
//         Stream.map(([version, payload]) => schema.make({ streamId, version, payload, timestamp }))
//       )
//   })
// }

const StreamId = Schema.String
  .pipe(Schema.brand("StreamId"))
  .annotations({
    description: "Identifier of the stream to which the event belongs"
  })

export interface EventPayload {
}

const Payload = Schema.Any.annotations({
  description: "Payload of the event"
})

const Timestamp = Schema.Date.annotations({
  description: "Timestamp of the event"
})

export const schema = Schema.Struct({
  streamId: StreamId,
  version: Version,
  payload: Payload,
  timestamp: Timestamp
}).annotations({
  identifier: "Event"
})
