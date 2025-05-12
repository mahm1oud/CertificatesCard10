# دليل الترحيل من PostgreSQL إلى MySQL

هذا الدليل يشرح كيفية ترحيل منصة الشهادات والبطاقات الإلكترونية من PostgreSQL إلى MySQL للاستخدام مع استضافة هوستنجر.

## مقدمة

تستخدم المنصة في إصدارها الأصلي قاعدة بيانات PostgreSQL، ولكن لتوافقها مع استضافة هوستنجر التي توفر MySQL كقاعدة بيانات افتراضية، قمنا بتحويل المشروع للعمل مع MySQL.

## ملفات التحويل

تم إنشاء الملفات التالية للمساعدة في عملية الترحيل:

1. `shared/schema.mysql.ts`: نسخة معدلة من مخطط قاعدة البيانات متوافقة مع MySQL
2. `server/db.mysql.ts`: ملف اتصال قاعدة البيانات المعدل للعمل مع MySQL
3. `hostinger.config.js`: ملف إعدادات للتوافق مع استضافة هوستنجر
4. `HOSTINGER-MYSQL-SETUP.md`: دليل شامل لإعداد المشروع على استضافة هوستنجر

## خطوات التحويل

### 1. استخدام مخطط MySQL

لاستخدام مخطط MySQL بدلاً من PostgreSQL:

```bash
# نسخ ملف مخطط MySQL إلى ملف المخطط الرئيسي
cp shared/schema.mysql.ts shared/schema.ts
```

أو قم بتعديل الكود للإشارة إلى الملف الجديد:

```typescript
// استيراد المخطط من الملف المخصص لـ MySQL
import * as schema from "../shared/schema.mysql";
```

### 2. استخدام اتصال MySQL

لاستخدام اتصال MySQL بدلاً من PostgreSQL:

```bash
# نسخ ملف اتصال MySQL إلى ملف الاتصال الرئيسي
cp server/db.mysql.ts server/db.ts
```

أو قم بتعديل الكود للإشارة إلى ملف الاتصال الجديد:

```typescript
// استيراد اتصال قاعدة البيانات من الملف المخصص لـ MySQL
import { db, checkDatabaseConnection } from "./db.mysql";
```

### 3. إعداد المتغيرات البيئية لـ MySQL

أضف المتغيرات البيئية التالية إلى ملف `.env`:

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=username
MYSQL_PASSWORD=password
MYSQL_DATABASE=certificates
```

### 4. التعديلات الرئيسية على الكود

#### أ. تغييرات في المخطط (schema.mysql.ts)

- تم تغيير `pgTable` إلى `mysqlTable`
- تم تغيير `timestamp` إلى `datetime`
- تم تغيير `boolean` إلى `tinyint`
- تم تغيير `text` إلى `varchar` مع تحديد الطول
- تم تغيير `uniqueIndex` إلى `unique`

#### ب. تغييرات في اتصال قاعدة البيانات (db.mysql.ts)

- تم تغيير استيراد `pg` إلى `mysql2/promise`
- تم تغيير `drizzle-orm/node-postgres` إلى `drizzle-orm/mysql2`
- تم تحديث خيارات الاتصال لتتناسب مع MySQL
- تم تعديل معالجة الأخطاء لتناسب رموز أخطاء MySQL

## أمثلة على الاختلافات الرئيسية

### اختلافات التعريفات

**PostgreSQL:**
```typescript
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**MySQL:**
```typescript
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  isAdmin: tinyint("is_admin").default(0),
  createdAt: datetime("created_at").notNull().defaultNow(),
});
```

### اختلافات الاتصال

**PostgreSQL:**
```typescript
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export const db = drizzle(pool, { schema });
```

**MySQL:**
```typescript
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';

const connection = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
});

export const db = drizzle(connection, { schema, mode: 'default' });
```

## ملاحظات مهمة

1. **القيم المنطقية (Boolean)**: في MySQL نستخدم `tinyint` بقيمة `0` أو `1` بدلاً من `boolean` بقيمة `true` أو `false`
2. **حقول النصوص**: في MySQL يجب تحديد طول النص في حقول `varchar`
3. **التواريخ**: في MySQL نستخدم `datetime` بدلاً من `timestamp`
4. **الفهارس**: في MySQL نستخدم `unique` بدلاً من `uniqueIndex`
5. **أخطاء الاتصال**: رموز أخطاء الاتصال تختلف بين PostgreSQL و MySQL

## المزايا والعيوب

### مزايا MySQL على هوستنجر

- متوفر في معظم خطط استضافة هوستنجر
- سهولة الإدارة من خلال phpMyAdmin
- أقل تكلفة من قواعد البيانات الأخرى
- توافق أفضل مع استضافة الويب التقليدية

### عيوب التحويل إلى MySQL

- قد تفقد بعض ميزات PostgreSQL المتقدمة
- الاختلافات في أنواع البيانات قد تسبب مشكلات في بعض الاستعلامات المعقدة
- يتطلب اختبار شامل بعد الترحيل

## خطوات ما بعد الترحيل

1. قم بإنشاء نسخة احتياطية من البيانات قبل الترحيل
2. قم بتنفيذ اختبارات شاملة بعد الترحيل
3. تحقق من أداء قاعدة البيانات في ظروف الاستخدام المختلفة
4. تأكد من أن جميع الوظائف تعمل كما هو متوقع

## مصادر إضافية

- [توثيق Drizzle ORM لـ MySQL](https://orm.drizzle.team/docs/mysql)
- [توثيق MySQL](https://dev.mysql.com/doc/)
- [مقارنة بين PostgreSQL و MySQL](https://www.oracle.com/mysql/mysql-vs-postgresql/)