/**
 * @since 1.0.0
 */
import * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Data from "effect/Data"
import * as Equal from "effect/Equal"
import { dual } from "effect/Function"
import * as Predicate from "effect/Predicate"
import * as PrimaryKey from "effect/PrimaryKey"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/journal/JournalEntry")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * An `JournalEntry` represents a serializable container for a request that will be
 * sent to an entity.
 *
 * The primary key of an `JournalEntry` provides the full address of the entity to
 * which the request should be sent, as well as the identifier of the request,
 * in the format: `<request-identifier>@<recipient-type>#<entity-identifier>`.
 *
 * @since 1.0.0
 * @category models
 */
export interface JournalEntry<
  Content extends JournalEntry.AnyEntry
> extends
  Equal.Equal,
  PrimaryKey.PrimaryKey,
  Serializable.Serializable<
    JournalEntry<Content>,
    JournalEntry.Encoded<
      Serializable.Serializable.Encoded<Content>
    >,
    Serializable.Serializable.Context<Content>
  >,
  JournalEntry.Proto<Content>
{}

/**
 * @category classes
 * @since 0.67.0
 */
type SerializableAny =
  | Serializable.Serializable<any, any, any>
  | Serializable.Serializable<never, never, any>

/**
 * @since 1.0.0
 */
export declare namespace JournalEntry {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto<Entry extends AnyEntry> {
    readonly [TypeId]: TypeId
    readonly entry: Entry
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Encoded<IA> {
    readonly entry: IA
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type AnyEntry = SerializableAny & PrimaryKey.PrimaryKey
}

const Proto = Data.unsafeStruct({
  entry: undefined,
  [TypeId]: TypeId,
  [PrimaryKey.symbol](this: JournalEntry<any>) {
    return `JournalEntry:${PrimaryKey.value(this.entry)}`
  },
  [Equal.symbol](that: JournalEntry<any>) {
    return Equal.equals(
      PrimaryKey.value(this),
      PrimaryKey.value(that)
    )
  },
  get [Serializable.symbol]() {
    return schema(Serializable.selfSchema(this.entry as any))
  }
})

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Content extends JournalEntry.AnyEntry>(
  entry: Content
): JournalEntry<Content> => {
  const journalEntry = Object.create(Proto)
  journalEntry.entry = entry
  return journalEntry
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isJournalEntry = (u: unknown): u is JournalEntry<
  JournalEntry.AnyEntry
> => Predicate.isObject(u) && Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category mapping
 */
export const map = dual<
  <
    A extends JournalEntry.AnyEntry,
    B extends JournalEntry.AnyEntry
  >(
    f: (value: A) => B
  ) => (
    self: JournalEntry<A>
  ) => JournalEntry<B>,
  <
    A extends JournalEntry.AnyEntry,
    B extends JournalEntry.AnyEntry
  >(
    self: JournalEntry<A>,
    f: (value: A) => B
  ) => JournalEntry<B>
>(2, (self, f) => make(f(self.entry)))

const journalEntryParse = <
  A extends JournalEntry.AnyEntry,
  R
>(
  decodeUnknown: ParseResult.DecodeUnknown<JournalEntry.Encoded<A>, R>
): ParseResult.DeclarationDecodeUnknown<JournalEntry<A>, R> =>
(u, options, ast) =>
  isJournalEntry(u) ?
    ParseResult.mapBoth(decodeUnknown(u, options), {
      onFailure: (e) => new ParseResult.Composite(ast, u, e),
      onSuccess: (e) => make(e.entry)
    })
    : ParseResult.fail(new ParseResult.Type(ast, u))

/**
 * @since 1.0.0
 * @category schemas
 */
export interface JournalEntry$<
  A extends Schema.Schema.Any
> extends
  Schema.AnnotableClass<
    JournalEntry$<A>,
    JournalEntry<Schema.Schema.Type<A>>,
    JournalEntry.Encoded<Schema.Schema.Encoded<A>>,
    Schema.Schema.Context<A>
  >
{}

/**
 * @since 1.0.0
 * @category models
 */
export interface JournalEntryFromSelf<
  Value extends Schema.Schema.Any
> extends
  Schema.AnnotableClass<
    JournalEntryFromSelf<Value>,
    JournalEntry<Schema.Schema.Type<Value>>,
    JournalEntry<Schema.Schema.Encoded<Value>>,
    Schema.Schema.Context<Value>
  >
{}

const JournalEntry$ = <A extends Schema.Schema.Any>(entry: A) =>
  Schema.Struct({
    entry
  })

/**
 * @since 1.0.0
 * @category schemas
 */
export const JournalEntryFromSelf = <
  Value extends Schema.Schema.Any
>(
  value: Value
): JournalEntryFromSelf<Value> => {
  return Schema.declare(
    [value],
    {
      decode: (item) => journalEntryParse(ParseResult.decodeUnknown(JournalEntry$(item))),
      encode: (item) => journalEntryParse(ParseResult.encodeUnknown(JournalEntry$(item)))
    },
    {}
  )
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const schema = <A extends Schema.Schema.Any>(
  entry: A
): JournalEntry$<A> =>
  Schema.transform(
    JournalEntry$(Schema.asSchema(entry)),
    JournalEntryFromSelf(
      Schema.typeSchema(entry)
    ),
    {
      strict: true,
      decode: (_) => make(_.entry),
      encode: (_) => ({ entry: _.entry })
    }
  )
