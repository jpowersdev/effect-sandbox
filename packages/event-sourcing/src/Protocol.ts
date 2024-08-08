/**
 * A protocol defines a particular view over an event stream.
 *
 * When defining a protocol, you must supply the types for the event stream ID, the event payload, and the aggregate itself.
 */
import type { EventStream } from "./EventStream.js"

export interface Protocol<ES extends EventStream.Any, Aggregate> {
  eventStream: ES
  aggregate: Aggregate
  streamId: EventStream.StreamId<ES>
  payload: EventStream.Payload<ES>
}
