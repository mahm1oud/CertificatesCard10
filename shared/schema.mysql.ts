import { mysqlTable, varchar, int, boolean, timestamp, json, date, unique, primaryKey, text } from 'drizzle-orm/mysql-core';
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User schema - المستخدمين
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(), // كلمة المرور إلزامية في البنية الحالية
  fullName: varchar("full_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull(),
  isAdmin: boolean("is_admin").default(false),
  role: varchar("role", { length: 20 }).default("user"), // دور المستخدم: admin, user, moderator, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // الحقول التالية قد لا تكون موجودة في بنية الجدول الحالية
  // وتم تعليقها لتجنب أي أخطاء
  /* 
  active: boolean("active").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  profileImageUrl: varchar("profile_image_url", { length: 255 }), // رابط صورة الملف الشخصي
  provider: varchar("provider", { length: 50 }), // المزود (google, facebook, twitter, linkedin)
  providerId: varchar("provider_id", { length: 100 }), // معرف المستخدم لدى المزود
  providerData: json("provider_data").$type<Record<string, any>>().default({}), // بيانات إضافية من المزود
  verifiedEmail: boolean("verified_email").default(false), // هل تم التحقق من البريد الإلكتروني
  locale: varchar("locale", { length: 10 }).default("ar"), // لغة المستخدم المفضلة
  */
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  isAdmin: true,
  role: true,
  // تعليق الحقول التي قد لا تكون موجودة في بنية الجدول الحالية
  /*
  active: true,
  profileImageUrl: true,
  provider: true,
  providerId: true,
  providerData: true,
  verifiedEmail: true,
  locale: true,
  */
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Category schema - التصنيفات
export const categories = mysqlTable("categories", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  displayOrder: int("display_order").notNull().default(0),
  icon: varchar("icon", { length: 50 }), // Category icon
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  slug: true,
  description: true,
  displayOrder: true,
  icon: true,
  active: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Template schema - القوالب
export const templates = mysqlTable("templates", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 200 }).notNull(),
  titleAr: varchar("title_ar", { length: 200 }), // Arabic title
  slug: varchar("slug", { length: 100 }).notNull(),
  categoryId: int("category_id").notNull().references(() => categories.id),
  imageUrl: varchar("image_url", { length: 255 }).notNull(),
  thumbnailUrl: varchar("thumbnail_url", { length: 255 }),
  displayOrder: int("display_order").notNull().default(0),
  fields: json("fields").$type<string[]>().notNull().default([]), // Fields that this template requires
  defaultValues: json("default_values").$type<Record<string, any>>().default({}), // Default values for fields
  settings: json("settings").$type<Record<string, any>>().default({}), // Font, color, position settings
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTemplateSchema = createInsertSchema(templates, {
  // إضافة قواعد التحقق المخصصة لبعض الحقول
  title: (schema) => schema.min(1, "عنوان القالب مطلوب"),
  categoryId: (schema) => schema.int("معرف التصنيف يجب أن يكون رقماً"), 
}).pick({
  title: true,
  titleAr: true,
  slug: true,
  categoryId: true,
  imageUrl: true,
  thumbnailUrl: true,
  displayOrder: true,
  fields: true,
  defaultValues: true,
  settings: true,
  active: true,
});

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

// Template Fields schema - حقول القوالب
export const templateFields = mysqlTable("template_fields", {
  id: int("id").primaryKey().autoincrement(),
  templateId: int("template_id").notNull().references(() => templates.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  labelAr: varchar("label_ar", { length: 100 }), // Arabic label
  type: varchar("type", { length: 20 }).notNull().default("text"), // text, textarea, date, checkbox, radio, select, image
  imageType: varchar("image_type", { length: 20 }), // logo, signature - لتحديد نوع الصورة عندما يكون النوع image
  required: boolean("required").default(false).notNull(),
  defaultValue: varchar("default_value", { length: 255 }),
  placeholder: varchar("placeholder", { length: 100 }),
  placeholderAr: varchar("placeholder_ar", { length: 100 }),
  options: json("options").$type<Record<string, any>[]>().default([]), // For select, radio
  position: json("position").$type<Record<string, any>>().default({}), // x, y, width, height (in %)
  style: json("style").$type<Record<string, any>>().default({}), // font, size, color, alignment, etc.
  displayOrder: int("display_order").default(0).notNull(),
});

export const insertTemplateFieldSchema = createInsertSchema(templateFields).pick({
  templateId: true,
  name: true,
  label: true,
  labelAr: true,
  type: true,
  required: true,
  defaultValue: true,
  placeholder: true,
  placeholderAr: true,
  options: true,
  position: true,
  style: true,
  displayOrder: true,
});

export type InsertTemplateField = z.infer<typeof insertTemplateFieldSchema>;
export type TemplateField = typeof templateFields.$inferSelect;

// Fonts schema - الخطوط
export const fonts = mysqlTable("fonts", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  nameAr: varchar("name_ar", { length: 100 }),
  family: varchar("family", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default("google"), // google, custom, system
  url: varchar("url", { length: 255 }),
  active: boolean("active").default(true).notNull(),
  isRtl: boolean("is_rtl").default(false).notNull(),
  displayOrder: int("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFontSchema = createInsertSchema(fonts).pick({
  name: true,
  nameAr: true,
  family: true,
  type: true,
  url: true,
  active: true,
  isRtl: true,
  displayOrder: true,
});

export type InsertFont = z.infer<typeof insertFontSchema>;
export type Font = typeof fonts.$inferSelect;

// Card schema - البطاقات المولدة من القوالب
export const cards = mysqlTable("cards", {
  id: int("id").primaryKey().autoincrement(),
  templateId: int("template_id").notNull().references(() => templates.id),
  userId: int("user_id").references(() => users.id),
  formData: json("form_data").$type<Record<string, any>>().notNull(),
  imageUrl: varchar("image_url", { length: 255 }).notNull(),
  thumbnailUrl: varchar("thumbnail_url", { length: 255 }),
  categoryId: int("category_id").notNull().references(() => categories.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastAccessed: timestamp("last_accessed"),
  quality: varchar("quality", { length: 20 }).default("medium"), // low, medium, high
  publicId: varchar("public_id", { length: 100 }).unique(), // For public access
  accessCount: int("access_count").default(0).notNull(),
  settings: json("settings").$type<Record<string, any>>().default({}), // Card-specific settings
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, draft, deleted
});

export const insertCardSchema = createInsertSchema(cards).pick({
  templateId: true,
  userId: true,
  formData: true,
  imageUrl: true,
  thumbnailUrl: true,
  categoryId: true,
  quality: true,
  publicId: true,
  settings: true,
  status: true,
});

export type InsertCard = z.infer<typeof insertCardSchema>;
export type Card = typeof cards.$inferSelect;

// Certificates schema - الشهادات
export const certificates = mysqlTable("certificates", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 200 }).notNull(),
  titleAr: varchar("title_ar", { length: 200 }),
  templateId: int("template_id").notNull().references(() => templates.id),
  userId: int("user_id").references(() => users.id),
  certificateType: varchar("certificate_type", { length: 50 }).notNull().default("appreciation"), // appreciation, training, education, teacher
  formData: json("form_data").$type<Record<string, any>>().notNull(),
  imageUrl: varchar("image_url", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiryDate: date("expiry_date"),
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, expired, revoked
  issuedTo: varchar("issued_to", { length: 200 }),
  issuedToGender: varchar("issued_to_gender", { length: 10 }).default("male"), // male, female - للقواعد النحوية العربية
  verificationCode: varchar("verification_code", { length: 50 }).unique(),
  publicId: varchar("public_id", { length: 100 }).unique(),
});

export const insertCertificateSchema = createInsertSchema(certificates).pick({
  title: true,
  titleAr: true,
  templateId: true,
  userId: true,
  certificateType: true,
  formData: true,
  imageUrl: true,
  expiryDate: true,
  status: true,
  issuedTo: true,
  issuedToGender: true,
  verificationCode: true,
  publicId: true,
});

export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificates.$inferSelect;

// Certificate Batches schema - مجموعات الشهادات (للإنشاء الجماعي)
export const certificateBatches = mysqlTable("certificate_batches", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 200 }).notNull(),
  userId: int("user_id").references(() => users.id),
  templateId: int("template_id").notNull().references(() => templates.id),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, processing, completed, failed
  totalItems: int("total_items").default(0).notNull(),
  processedItems: int("processed_items").default(0).notNull(),
  sourceType: varchar("source_type", { length: 20 }).default("excel").notNull(), // excel, csv, manual
  sourceData: varchar("source_data", { length: 255 }), // Path to source file
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertCertificateBatchSchema = createInsertSchema(certificateBatches).pick({
  title: true,
  userId: true,
  templateId: true,
  status: true,
  totalItems: true,
  sourceType: true,
  sourceData: true,
});

export type InsertCertificateBatch = z.infer<typeof insertCertificateBatchSchema>;
export type CertificateBatch = typeof certificateBatches.$inferSelect;

// Certificate Batch Items schema - عناصر مجموعات الشهادات
export const certificateBatchItems = mysqlTable("certificate_batch_items", {
  id: int("id").primaryKey().autoincrement(),
  batchId: int("batch_id").notNull().references(() => certificateBatches.id, { onDelete: "cascade" }),
  certificateId: int("certificate_id").references(() => certificates.id),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, processing, completed, failed
  formData: json("form_data").$type<Record<string, any>>().notNull(),
  errorMessage: text("error_message"),
  rowNumber: int("row_number"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const insertCertificateBatchItemSchema = createInsertSchema(certificateBatchItems).pick({
  batchId: true,
  certificateId: true,
  status: true,
  formData: true,
  errorMessage: true,
  rowNumber: true,
});

export type InsertCertificateBatchItem = z.infer<typeof insertCertificateBatchItemSchema>;
export type CertificateBatchItem = typeof certificateBatchItems.$inferSelect;

// Settings schema - إعدادات النظام
export const settings = mysqlTable("settings", {
  id: int("id").primaryKey().autoincrement(),
  key: varchar("key", { length: 100 }).notNull(),
  value: json("value").$type<Record<string, any>>().notNull(),
  category: varchar("category", { length: 50 }).default("general").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: int("updated_by").references(() => users.id),
}, (table) => {
  return {
    categoryKeyIdx: unique().on(table.category, table.key),
  };
});

export const insertSettingSchema = createInsertSchema(settings).pick({
  key: true,
  value: true,
  category: true,
  description: true,
  updatedBy: true,
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

// Auth Settings schema - إعدادات المصادقة
export const authSettings = mysqlTable("auth_settings", {
  id: int("id").primaryKey().autoincrement(),
  provider: varchar("provider", { length: 50 }).notNull(), // google, facebook, twitter, linkedin, etc.
  clientId: varchar("client_id", { length: 255 }),
  clientSecret: varchar("client_secret", { length: 255 }),
  redirectUri: varchar("redirect_uri", { length: 255 }),
  enabled: boolean("enabled").default(false).notNull(),
  settings: json("settings").$type<Record<string, any>>().default({}),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: int("updated_by").references(() => users.id),
});

// SEO schema - إعدادات تحسين محركات البحث
export const seo = mysqlTable("seo", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  keywords: json("keywords").$type<string[]>().default([]),
  ogImage: varchar("og_image", { length: 255 }), // صورة Open Graph للمشاركات
  entityType: varchar("entity_type", { length: 20 }).notNull(), // "global", "category", "template"
  entityId: int("entity_id"), // معرف الكيان المرتبط (إذا كان النوع غير global)
  canonicalUrl: varchar("canonical_url", { length: 255 }),
  structuredData: json("structured_data").$type<Record<string, any>>().default({}), // بيانات JSON-LD منظمة
  noIndex: boolean("no_index").default(false).notNull(), // عدم فهرسة المحتوى
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: int("updated_by").references(() => users.id),
}, (table) => {
  return {
    entityTypeIdIdx: unique().on(table.entityType, table.entityId),
  };
});

export const insertAuthSettingSchema = createInsertSchema(authSettings).pick({
  provider: true,
  clientId: true,
  clientSecret: true,
  redirectUri: true,
  enabled: true,
  settings: true,
  updatedBy: true,
});

export type InsertAuthSetting = z.infer<typeof insertAuthSettingSchema>;
export type AuthSetting = typeof authSettings.$inferSelect;

export const insertSeoSchema = createInsertSchema(seo, {
  title: (schema) => schema.min(1, "العنوان مطلوب"),
  entityType: (schema) => schema.refine(val => ["global", "category", "template"].includes(val), {
    message: "نوع الكيان يجب أن يكون global أو category أو template"
  }),
}).pick({
  title: true,
  description: true,
  keywords: true,
  ogImage: true,
  entityType: true,
  entityId: true,
  canonicalUrl: true,
  structuredData: true,
  noIndex: true,
  updatedBy: true,
});

export type InsertSeo = z.infer<typeof insertSeoSchema>;
export type Seo = typeof seo.$inferSelect;

export const usersRelations = relations(users, ({ many }) => ({
  cards: many(cards),
  certificates: many(certificates),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  templates: many(templates),
}));

// جدول مشاهدات الشهادات
export const certificateViews = mysqlTable("certificate_views", {
  id: int("id").primaryKey().autoincrement(),
  certificateId: int("certificateId").notNull().references(() => certificates.id, { onDelete: "cascade" }),
  ip: varchar("ip", { length: 50 }),
  userAgent: text("userAgent"),
  viewedAt: timestamp("viewedAt").notNull().defaultNow(),
});

// جدول مشاركات الشهادات
export const certificateShares = mysqlTable("certificate_shares", {
  id: int("id").primaryKey().autoincrement(),
  certificateId: int("certificateId").notNull().references(() => certificates.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 50 }),
  ip: varchar("ip", { length: 50 }),
  sharedAt: timestamp("sharedAt").notNull().defaultNow(),
});

// جدول تسجيل أخطاء النظام
export const errorLogs = mysqlTable("error_logs", {
  id: int("id").primaryKey().autoincrement(),
  errorType: varchar("error_type", { length: 50 }).notNull(), // client, server, database, etc.
  errorMessage: text("error_message").notNull(),
  errorStack: text("error_stack"),
  userId: int("userId").references(() => users.id),
  path: varchar("path", { length: 255 }),
  method: varchar("method", { length: 10 }),
  statusCode: int("status_code"),
  requestData: json("request_data").$type<Record<string, any>>(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  ip: varchar("ip", { length: 50 }),
  userAgent: text("user_agent"),
});

// جدول تفضيلات المستخدمين
export const userPreferences = mysqlTable("user_preferences", {
  userId: int("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  theme: varchar("theme", { length: 20 }).default("light"), // light, dark
  layout: varchar("layout", { length: 20 }).default("boxed"), // boxed, wide, fluid
  language: varchar("language", { length: 10 }).default("ar"), // ar, en
  fontSize: varchar("fontSize", { length: 10 }), // small, medium, large
  sidebarCollapsed: boolean("sidebar_collapsed").default(false),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// علاقات بين الجداول
export const templatesRelations = relations(templates, ({ one, many }) => ({
  category: one(categories, {
    fields: [templates.categoryId],
    references: [categories.id],
  }),
  templateFields: many(templateFields),
  certificates: many(certificates),
}));

export const certificatesRelations = relations(certificates, ({ one, many }) => ({
  template: one(templates, {
    fields: [certificates.templateId],
    references: [templates.id],
  }),
  user: one(users, {
    fields: [certificates.userId],
    references: [users.id],
  }),
  views: many(certificateViews),
  shares: many(certificateShares),
}));

export const templateFieldsRelations = relations(templateFields, ({ one }) => ({
  template: one(templates, {
    fields: [templateFields.templateId],
    references: [templates.id],
  }),
}));

export const cardsRelations = relations(cards, ({ one }) => ({
  template: one(templates, {
    fields: [cards.templateId],
    references: [templates.id],
  }),
  user: one(users, {
    fields: [cards.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [cards.categoryId],
    references: [categories.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const certificateBatchesRelations = relations(certificateBatches, ({ one, many }) => ({
  template: one(templates, {
    fields: [certificateBatches.templateId],
    references: [templates.id],
  }),
  user: one(users, {
    fields: [certificateBatches.userId],
    references: [users.id],
  }),
  items: many(certificateBatchItems),
}));

export const certificateBatchItemsRelations = relations(certificateBatchItems, ({ one }) => ({
  batch: one(certificateBatches, {
    fields: [certificateBatchItems.batchId],
    references: [certificateBatches.id],
  }),
  certificate: one(certificates, {
    fields: [certificateBatchItems.certificateId],
    references: [certificates.id],
  }),
}));

// جداول تحويل بنية PostgreSQL إلى MySQL
export { users as pgUsers, categories as pgCategories, templates as pgTemplates, 
  templateFields as pgTemplateFields, fonts as pgFonts, cards as pgCards, 
  certificates as pgCertificates, certificateBatches as pgCertificateBatches, 
  certificateBatchItems as pgCertificateBatchItems, settings as pgSettings, 
  authSettings as pgAuthSettings, seo as pgSeo, certificateViews as pgCertificateViews, 
  certificateShares as pgCertificateShares, errorLogs as pgErrorLogs, 
  userPreferences as pgUserPreferences };

export default {
  users,
  categories,
  templates,
  templateFields,
  fonts,
  cards,
  certificates,
  certificateBatches,
  certificateBatchItems,
  settings,
  authSettings,
  seo,
  certificateViews,
  certificateShares,
  errorLogs,
  userPreferences
};