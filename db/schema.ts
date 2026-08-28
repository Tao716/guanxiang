import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const visitors = sqliteTable("visitors", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const profiles = sqliteTable("profiles", {
  visitorId: text("visitor_id").primaryKey().references(() => visitors.id, { onDelete:"cascade" }),
  nickname: text("nickname").notNull().default(""),
  lifeStage: text("life_stage").notNull(),
  focus: text("focus").notNull(),
  responseStyle: text("response_style").notNull(),
  topic: text("topic").notNull().default("事业"),
  birthContextJson: text("birth_context_json"),
  topicContextJson: text("topic_context_json"),
  updatedAt: text("updated_at").notNull(),
});

export const readings = sqliteTable("readings", {
  id: text("id").primaryKey(),
  visitorId: text("visitor_id").notNull().references(() => visitors.id, { onDelete:"cascade" }),
  clientId: integer("client_id").notNull(),
  question: text("question").notNull(),
  category: text("category").notNull(),
  topic: text("topic").notNull().default("选择"),
  topicContextJson: text("topic_context_json"),
  linesJson: text("lines_json").notNull(),
  readingJson: text("reading_json"),
  aiReadingJson: text("ai_reading_json"),
  commitmentJson: text("commitment_json"),
  followUpsJson: text("follow_ups_json"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_readings_visitor_created").on(table.visitorId, table.createdAt),
]);

export const aiGenerations = sqliteTable("ai_generations", {
  id: text("id").primaryKey(),
  visitorId: text("visitor_id").references(() => visitors.id, { onDelete:"set null" }),
  feature: text("feature").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  status: text("status").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  inputChars: integer("input_chars").notNull().default(0),
  outputChars: integer("output_chars").notNull().default(0),
  errorCode: text("error_code"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_ai_generations_created").on(table.createdAt),
  index("idx_ai_generations_feature_model").on(table.feature, table.model),
]);

export const feedback = sqliteTable("feedback", {
  id: text("id").primaryKey(),
  visitorId: text("visitor_id").references(() => visitors.id, { onDelete:"set null" }),
  readingId: text("reading_id").references(() => readings.id, { onDelete:"cascade" }),
  helpful: integer("helpful", { mode:"boolean" }).notNull(),
  reason: text("reason"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_feedback_reading").on(table.readingId),
]);

export const usageEvents = sqliteTable("usage_events", {
  id: text("id").primaryKey(),
  visitorId: text("visitor_id").references(() => visitors.id, { onDelete:"set null" }),
  eventName: text("event_name").notNull(),
  route: text("route").notNull(),
  metadataJson: text("metadata_json"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_usage_events_name_created").on(table.eventName, table.createdAt),
]);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  visitorId: text("visitor_id").references(() => visitors.id, { onDelete:"cascade" }),
  feature: text("feature").notNull(),
  windowStart: text("window_start").notNull(),
  count: integer("count").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_rate_limits_visitor_window").on(table.visitorId, table.windowStart),
]);

export const memberships = sqliteTable("memberships", {
  visitorId: text("visitor_id").primaryKey().references(() => visitors.id, { onDelete:"cascade" }),
  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  provider: text("provider"),
  providerCustomerId: text("provider_customer_id"),
  providerSubscriptionId: text("provider_subscription_id"),
  currentPeriodEnd: text("current_period_end"),
  cancelAtPeriodEnd: integer("cancel_at_period_end", { mode:"boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  visitorId: text("visitor_id").references(() => visitors.id, { onDelete:"set null" }),
  provider: text("provider").notNull(),
  providerOrderId: text("provider_order_id"),
  plan: text("plan").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_orders_visitor_created").on(table.visitorId, table.createdAt),
  index("idx_orders_provider_order").on(table.provider, table.providerOrderId),
]);
