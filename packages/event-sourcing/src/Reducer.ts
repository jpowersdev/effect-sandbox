export interface Reducer<State, Event> {
  empty: State
  handle(state: State, event: Event): State
}

export declare namespace Reducer {
  export type Any = Reducer<any, any>

  export type State<R> = R extends Reducer<infer State, any> ? State : never

  export type Event<R> = R extends Reducer<any, infer Event> ? Event : never
}
