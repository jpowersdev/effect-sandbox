import * as it from "@effect/vitest"
import { randomUUID } from "crypto"
import { Data, Function, Inspectable, Option, Struct } from "effect"
import { reduceRight } from "effect/Array"
import * as Effect from "effect/Effect"
import { toJSON } from "effect/Inspectable"
import * as Stream from "effect/Stream"
import type { EventStreamReader } from "../src/EventStore.js"

export interface UserState {
  userId: string
  name?: string
  email?: string
}

class User {
  constructor(
    public userId: string,
    public name: string,
    public email: string
  ) {}

  static Empty = new User("", "", "")

  withId(newId: string) {
    return Struct.evolve(this, { userId: () => newId })
  }

  withName(newName: string) {
    return Struct.evolve(this, { name: () => newName })
  }

  withEmail(newEmail: string) {
    return Struct.evolve(this, { email: () => newEmail })
  }
}

export type UserEvent = Data.TaggedEnum<{
  UserCreated: {}
  UserIdChanged: {
    userId: string
  }
  NameChanged: {
    name: string
  }
  EmailChanged: {
    email: string
  }
}>

interface Reducer<S, E> {
  empty: S
  apply(state: S, event: E): S
}

declare namespace Reducer {
  export type Any = Reducer<any, any>
  export type State<R> = R extends Reducer<infer S, infer _> ? S : never
  export type Event<R> = R extends Reducer<infer _, infer E> ? E : never
}

class UserReducer implements AggregateReducer<User, UserEvent> {
  empty = User.Empty
  apply(user: User, event: UserEvent): User {
    return DomainEvent.$match(event, {
      UserCreated: () => this.empty,
      UserIdChanged: ({ userId }) => user.withId(userId),
      NameChanged: ({ name }) => user.withName(name),
      EmailChanged: ({ email }) => user.withEmail(email)
    })
  }
}

interface UserCommand {
  apply(user: User): Effect.Effect<Array<UserEvent>>
}

const RegisterNewUser = (userId: string, name: string, email: string) => ({
  apply(user: User) {
    return Effect.succeed(
      [
        DomainEvent.UserCreated(),
        DomainEvent.UserIdChanged({ userId }),
        DomainEvent.NameChanged({ name }),
        DomainEvent.EmailChanged({ email })
      ]
    )
  }
} as UserCommand)

type Protocol<A extends Aggregate.Any, E> = {
  aggregate: A
  events: Array<E>
}

declare namespace Protocol {
  export type Any = Protocol<Aggregate.Any, any>
  export type Aggregate<P> = P extends Protocol<infer A, any> ? A : never
  export type EventStream<P> = P extends Protocol<any, infer E> ? E : never
}

type AggregateReducer<P extends Protocol.Any> = Reducer<Protocol.Aggregate<P>, Protocol.EventStream<P>>

export class AggregateSnapshot<A extends Aggregate.Any> {
  constructor(
    public aggregate: A,
    public version: number,
    public timestamp: Date
  ) {}

  conformsTo(expectedVersion: number) {
    return this.aggregate.version === expectedVersion
  }
}

class SnapshotReducer<P extends Protocol.Any>
  implements Reducer<AggregateSnapshot<Protocol.Aggregate<P>>, Protocol.EventStream<P>>
{
  empty: AggregateSnapshot<Protocol.Aggregate<P>>
  constructor(
    private aggregateReducer: AggregateReducer<P>
  ) {
    this.empty = new AggregateSnapshot(this.aggregateReducer.empty, 0, new Date())
  }
  apply(snapshot: AggregateSnapshot<Protocol.Aggregate<P>>, event: Protocol.EventStream<P>) {
    return new AggregateSnapshot(snapshot.aggregate.apply(event), snapshot.version + 1, new Date())
  }
}

export interface AggregateRepository<P extends Protocol.Any> {
  load(aggregateId: string): Effect.Effect<AggregateSnapshot<Protocol.Aggregate<P>>>
}

class ReplayingAggregateRepository<P extends Protocol.Any> {
  constructor(
    eventStream: EventStreamReader<>,
    reducer: AggregateReducer<P>,
    pageSize: number
  ) {}
}

export interface Aggregate<R extends Reducer.Any> {
  aggregateId: string
  state: Reducer.State<R>
  version: number

  load(events: Array<Reducer.Event<R>>): this
  apply(event: Reducer.Event<R>): this
}

export declare namespace Aggregate {
  export type Any = Aggregate<any>
}

export const Aggregate = <R extends Reducer.Any>(reducer: R) =>
  Data.unsafeStruct({
    aggregateId: undefined,
    state: undefined,
    version: 0,
    load(this: Aggregate<R>, events: Array<Reducer.Event<R>>) {
      return events.reduce((user, event) => user.apply(event), this)
    },
    apply(this: Aggregate<R>, event: Reducer.Event<R>) {
      const state = reducer(this.state, event)
      this.state = state
      this.version += 1
      return this
    },
    toJSON(this: UserAggregate) {
      return {
        _id: "Aggregate",
        aggregateId: this.aggregateId,
        version: this.version,
        state: Inspectable.toJSON(this.state)
      }
    }
  })

export const DomainEvent = Data.taggedEnum<UserEvent>()

interface EventStore {
  events: Map<string, Array<UserEvent>>
  append(aggregateId: string, events: Array<UserEvent>): Array<UserEvent>
  read(aggregateId: string): Array<UserEvent>
}

const EventStore = Data.unsafeStruct({
  events: new Map<string, Array<UserEvent>>([]),
  append(this: EventStore, aggregateId: string, events: Array<UserEvent>) {
    const current = this.events.get(aggregateId)
    const newEvents = current ? [...current, ...events] : events
    this.events.set(aggregateId, newEvents)
    return newEvents
  },
  read(this: EventStore, aggregateId: string) {
    return this.events.get(aggregateId) ?? []
  }
})

const makeEventStore = (): EventStore => Object.create(EventStore)

it.describe("EventSourcing", () => {
  it.it("should create an instance", () => {
    const eventStore = makeEventStore()

    const aggregateId = randomUUID()

    const userId = randomUUID()
    eventStore.append(aggregateId, [
      DomainEvent.Register({
        userId,
        name: "John",
        email: "jon@email.com"
      }),
      DomainEvent.SetName({ name: "John Doe" }),
      DomainEvent.SetEmail({ email: "johndoe@email.com" })
    ])

    const userAggregate = makeAggregate(aggregateId)

    it.expect(userAggregate.state).toBeDefined()

    const events = eventStore.read(aggregateId)

    it.expect(events.length).toBe(3)

    const loadedAggregate = userAggregate.load(events)

    it.expect(loadedAggregate.state).toStrictEqual({ userId, name: "John Doe", email: "johndoe@email.com" })
  })
})
