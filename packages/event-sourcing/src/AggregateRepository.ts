export interface AggregateSnapshot<T> {
  id: string
  version: number
  state: T
}

export declare namespace AggregateRepository {
  type Proto = {}

  type Snapshot<T extends AggregateRepository.Proto> = AggregateSnapshot<T>
}

