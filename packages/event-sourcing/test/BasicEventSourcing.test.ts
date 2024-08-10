import * as it from "@effect/vitest"
import { randomUUID } from "crypto"
import { Data, Function, Struct } from "effect"
import * as Effect from "effect/Effect"
import { toJSON } from "effect/Inspectable"
import * as Stream from "effect/Stream"

export interface UserState {
  userId: string
  name: string
  email: string

  setName(name: string): UserState
  setEmail(email: string): UserState
}

export const UserState = Data.unsafeStruct({
  userId: undefined,
  name: undefined,
  email: undefined,
  setName(this: UserState, name: string) {
    return makeUser({ ...this, name })
  },
  setEmail(this: UserState, email: string) {
    return makeUser({ ...this, email })
  }
})

const makeUser = (
  { email, name, userId }: { userId: string; name: string; email: string }
): UserState => {
  const user = Object.create(UserState)
  user.userId = userId
  user.name = name
  user.email = email
  return user
}

export interface UserAggregate {
  aggregateId: string
  state: UserState
  version: number

  load(events: Array<DomainEvent>): UserAggregate
  apply(event: DomainEvent): UserAggregate
}

export const UserAggregate = Data.unsafeStruct({
  aggregateId: undefined,
  state: undefined,
  version: 0,
  load(this: UserAggregate, events: Array<DomainEvent>) {
    return events.reduce((user, event) => user.apply(event), this)
  },
  apply(this: UserAggregate, event: DomainEvent) {
    const state = userReducer(this.state, event)
    this.state = state
    this.version += 1
    return this
  },
  toJSON(this: UserAggregate) {
    return {
      _id: "UserAggregate",
      aggregateId: this.aggregateId,
      version: this.version,
      state: {
        userId: this.state.userId,
        name: this.state.name,
        email: this.state.email
      }
    }
  }
})

export const makeAggregate = (
  aggregateId: string,
  state?: UserState,
  version?: number
): UserAggregate => {
  const aggregate = Object.create(UserAggregate)
  aggregate.aggregateId = aggregateId
  aggregate.state = state ?? makeUser({ userId: "", name: "", email: "" })
  aggregate.version = version ?? 1
  return aggregate
}

export type DomainEvent = Data.TaggedEnum<{
  Register: {
    userId: string
    name: string
    email: string
  }
  SetName: {
    name: string
  }
  SetEmail: {
    email: string
  }
}>

export const DomainEvent = Data.taggedEnum<DomainEvent>()

const userReducer = (
  state: UserState,
  event: DomainEvent
): UserState =>
  DomainEvent.$match(event, {
    Register: makeUser,
    SetName: ({ name }) => state.setName(name),
    SetEmail: ({ email }) => state.setEmail(email)
  })

interface EventStore {
  events: Map<string, Array<DomainEvent>>
  append(aggregateId: string, events: Array<DomainEvent>): Array<DomainEvent>
  read(aggregateId: string): Array<DomainEvent>
}

const EventStore = Data.unsafeStruct({
  events: new Map<string, Array<DomainEvent>>([]),
  append(this: EventStore, aggregateId: string, events: Array<DomainEvent>) {
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
