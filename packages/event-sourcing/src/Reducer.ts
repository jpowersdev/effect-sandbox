import type { Types } from "effect"
import { Chunk } from "effect"
import type { EventStream } from "./EventStream.js"
import type { Protocol } from "./Protocol.js"

export interface Reducer<State, Event> {
  empty: State
  handle(state: State, event: Event): State
}

export declare namespace Reducer {
  export type Any = Reducer<any, any>

  export type State<R> = R extends Reducer<infer State, any> ? State : never

  export type Event<R> = R extends Reducer<any, infer Event> ? Event : never

  export type AggregateReducer<P extends Protocol.Any> = Reducer<
    Protocol.Aggregate<P>,
    Protocol.EventPayload<P>
  >
}

export interface ReducerFn<
  ES extends EventStream.Any,
  R extends Reducer.Any
> {
  (event: Types.Covariant<ES>): Reducer.State<R>
}
