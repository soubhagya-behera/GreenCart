# GreenCart MySQL → PostgreSQL Migration Audit

Note: I could not render `screenshots/schema.png` (this model doesn't support image input), but I inspected the **live MySQL database** directly (read-only queries against `localhost:3306/greencart`), which is more authoritative. No files were modified.

---

## 1. Inventory of JPA artifacts

### 1.1 Entities (13) — `src/main/java/com/example/greencart/entity/`

| Entity | Table | `@Table` override | ID strategy |
|---|---|---|---|
| `User` | `users` | — | IDENTITY |
| `Product` | `product` | — | IDENTITY |
| `Cart` | `cart` | — | IDENTITY |
| `CartItem` | `cart_item` | — | IDENTITY |
| `Coupon` | `coupon` | — | IDENTITY |
| `Notification` | `notification` | — | IDENTITY |
| `Order` | `orders` | `@Table(name="orders")` | IDENTITY |
| `OrderItem` | `order_item` | — | IDENTITY |
| `ProductImage` | `product_image` | — | IDENTITY |
| `Recipe` | `recipe` | — | IDENTITY |
| `RecipeIngredient` | *(Embeddable, no table)* | — | n/a |
| `Review` | `review` | — | IDENTITY |
| `Wishlist` | `wishlist` | — | IDENTITY |

**Every `@Id` uses `@GeneratedValue(strategy = GenerationType.IDENTITY)` on a `Long`.**

### 1.2 Relationships

| Type | Count | Details |
|---|---|---|
| `@OneToOne` | 1 | `Cart.user → User` (unique constraint on `cart.user_id`) |
| `@OneToMany` | 3 | `Product.images` (mappedBy=`product`, cascade ALL), `Cart.items` (mappedBy=`cart`, cascade ALL), `Order.items` (mappedBy=`order`, cascade ALL, orphanRemoval) |
| `@ManyToOne` | 14 | `Product.seller`, `CartItem.cart` (`@JoinColumn(name="cart_id")`), `CartItem.product`, `Notification.user`, `Order.user`, `Order.assignedDelivery`, `OrderItem.order`, `OrderItem.product`, `ProductImage.product` (`@JoinColumn(name="product_id")`), `Recipe.createdBy`, `Review.user`, `Review.product`, `Wishlist.user`, `Wishlist.product` |
| `@ManyToMany` | 0 | none |
| `@JoinTable` | 0 | none (only `@JoinColumn`) |
| `@ElementCollection` | 1 | `Recipe.ingredients` → table `recipe_ingredients` |

### 1.3 Repositories (11)
`ProductRepository`, `UserRepository`, `OrderRepository`, `CartRepository`, `CartItemRepository`, `CouponRepository`, `NotificationRepository`, `OrderItemRepository`, `RecipeRepository`, `ReviewRepository`, `WishlistRepository`.

### 1.4 SQL queries
- **Native SQL:** none.
- **JPQL:** exactly **1** — `ProductRepository.findDistinctCategories`:
  `SELECT DISTINCT p.category FROM Product p WHERE p.category IS NOT NULL` (portable, works on PostgreSQL).
- **JDBC/EntityManager/raw SQL:** none found anywhere (`JdbcTemplate`, `DriverManager`, `CallableStatement` etc. = 0 hits).

### 1.5 MySQL-specific SQL in app code
**None.** No `NOW()`, `LIMIT`, backticks, `DATE_FORMAT`, `ENUM`, `TINYINT`, `ON DUPLICATE`, etc.

### 1.6 Configuration
- `application.properties` (and `application-example.properties`):
  - `spring.datasource.url=jdbc:mysql://localhost:3306/greencart`
  - username `root` / password `Behera45507skb`
  - `spring.jpa.database-platform=org.hibernate.dialect.MySQL8Dialect`
  - `spring.jpa.hibernate.ddl-auto=update`
- `pom.xml`: MySQL driver `com.mysql:mysql-connector-j` (Spring Boot 3.2.5 manages version). **No PostgreSQL driver present.**

### 1.7 DB init / schema / seed
- No `*.sql` files anywhere in the repo.
- No `schema.sql` / `data.sql` / `import.sql`.
- No `CommandLineRunner` / `ApplicationRunner` / `@PostConstruct` seed code.
- Schema is produced by Hibernate `ddl-auto=update`. All existing data lives **only** in the live MySQL DB.

---

## 2. Live MySQL schema (authoritative, inspected via information_schema)

**13 tables** — name-for-name identical to the JPA entity table set: `cart, cart_item, coupon, notification, order_item, orders, product, product_image, recipe, recipe_ingredients, review, users, wishlist`. All `InnoDB`, `utf8mb4_0900_ai_ci`. No views, triggers, or stored procedures.

**Data volumes (total 59 rows):**

| Table | Rows | | Table | Rows |
|---|---|---|---|---|
| users | 3 | | order_item | 13 |
| product | 15 | | orders | 13 |
| cart | 3 | | recipe | 1 |
| cart_item | 6 | | recipe_ingredients | 3 |
| coupon | 0 | | review | 2 |
| notification | 0 | | wishlist | 0 |
| product_image | 0 | | | |

**Types in use:** `bigint` + `auto_increment` (all PKs), `bit(1)` (booleans), `double` (money), `int`, `varchar(255/2000)`, `text` (`recipe.instructions` via `@Column(columnDefinition="TEXT")`), `datetime(6)` (`LocalDateTime`).

**16 foreign keys** exist and all match JPA expectations (see 3.3). **17 unique/primary indexes**, including unique constraints on `users.email`, `coupon.code`, `cart.user_id`.

---

## 3. JPA-expected vs MySQL — comparison

### 3.1 Table coverage
- **Tables in MySQL:** all 13 ✓
- **Tables expected by JPA but missing from MySQL:** none ✓
- **Tables in MySQL with no JPA entity:** none ✓ (1:1 match)

### 3.2 Column differences
- **`product.weight` (varchar 255)** exists in MySQL but has **no corresponding field in the JPA `Product` entity** (Product.java:12-46 has no `weight`). Likely a legacy column. Currently holds **0 non-empty values** → no data loss risk, but if you want schema parity the column must be added manually to PostgreSQL (Hibernate will not recreate it, and will not drop it either).
- Every other column matches its entity field exactly.

### 3.3 Foreign keys / relationships — all consistent
`cart.user_id`, `cart_item.cart_id/product_id`, `notification.user_id`, `order_item.order_id/product_id`, `orders.user_id/assigned_delivery_id`, `product.seller_id`, `product_image.product_id`, `recipe.created_by_id`, `recipe_ingredients.recipe_id`, `review.user_id/product_id`, `wishlist.user_id/product_id`. **No missing relationships, no orphan FKs.**

### 3.4 Unique constraints
`users.email` (UK), `coupon.code` (UK), `cart.user_id` (UK) — all present in MySQL, all will be recreated by Hibernate in PostgreSQL.

---

## 4. Type conversion matrix (MySQL → PostgreSQL)

| MySQL | PostgreSQL | Risk |
|---|---|---|
| `bigint AUTO_INCREMENT` | `bigint GENERATED BY DEFAULT AS IDENTITY` | low — explicit-ID inserts work; must reset sequences after load |
| `bit(1)` (Boolean) | `boolean` | low — cast to 0/1 during extraction (`CAST(col AS UNSIGNED)`) |
| `double` | `double precision` | low |
| `int` | `integer` | none |
| `varchar(n)` | `varchar(n)` | none |
| `text` (instructions) | `text` (`columnDefinition="TEXT"` is valid PG syntax) | none |
| `datetime(6)` | `timestamp(6) without time zone` | none |

### 4.1 Enum differences
**None.** No `@Enumerated` anywhere. `role`, `paymentStatus`, `orderStatus` are plain `String` (`user/seller/delivery`, `Pending/Paid`, `Awaiting Payment/...`). No enum migration needed.

### 4.2 Date/time
All `LocalDateTime` → `datetime(6)`/`timestamp(6)`; values copy verbatim. No `TIMESTAMP`/timezone pitfalls.

### 4.3 Boolean
`bit(1)` → `boolean`. Preserve with explicit 0/1 cast in the extract query.

### 4.4 Decimal/numeric
All money is `Double` (floating point) in both DBs — type-compatible. (Precision caveat exists today on MySQL too; not a migration blocker.)

### 4.5 Reserved keywords
- Tables `orders` and `users`: **not** reserved in PostgreSQL (only `order`/`user` are). No quoting needed.
- Columns (`name`, `role`, `comment`, `active`, `total`, `code`, `address`…): none reserved in PG (`comment`/`role` are non-reserved). **Safe.**

### 4.6 AUTO_INCREMENT/identity
All PKs use IDENTITY. In PG this becomes `GENERATED BY DEFAULT AS IDENTITY`, so migrating with explicit IDs is allowed. **Critical post-load step:** `SELECT setval(pg_get_serial_sequence('table','id'), MAX(id))` per table, otherwise the identity sequences start at 1 and the next insert collides with migrated rows.

### 4.7 MySQL-specific SQL that will break on PG
**None in code.** Only one portable JPQL query. The app-level risk is essentially nil.

---

## 5. Behavioral differences to be aware of (not blockers)

- **Case sensitivity:** MySQL `utf8mb4_0900_ai_ci` is case-insensitive; PostgreSQL is case-sensitive. `findByEmail`, `findByCode`, and role string matching become case-sensitive. Audit existing values (emails appear lowercase; coupon codes empty) — likely fine.
- `ddl-auto=update` only *adds*; it never alters types or drops columns/tables. The PG schema you create for migration must therefore be created correctly up front (Hibernate-generated DDL or explicit DDL mirroring the MySQL types).
- FK constraint names differ (Hibernate emits hashed names) — irrelevant to data.

---

## 6. Summary of migration problems / action items

| # | Item | Severity |
|---|---|---|
| 1 | Swap `pom.xml`: remove `mysql-connector-j`, add `org.postgresql:postgresql` (version managed by Boot 3.2.5) | required |
| 2 | Update `application.properties`: URL → `jdbc:postgresql://localhost:5432/greencart`, add `spring.datasource.driver-class-name=org.postgresql.Driver`, dialect → `org.hibernate.dialect.PostgreSQLDialect` (both files) | required |
| 3 | Create empty PostgreSQL DB `greencart`; let Hibernate `update` generate schema (matches entity set 1:1) | required |
| 4 | Migrate 59 rows preserving explicit IDs (recommend `pgloader`, or a generated SQL script; disable FK checks or order by dependency: users → product/recipe → cart/orders → children) | required |
| 5 | Reset identity sequences (`setval`) to `MAX(id)` on every table with data | required |
| 6 | `product.weight` orphan column — decide: add manually to PG for parity, or drop from MySQL (data is empty) | decision |
| 7 | Verify row counts & spot-check FK integrity after load | required |
| 8 | No app-code SQL changes needed (0 native queries) | none |

**Bottom line:** This is a clean, low-risk migration — a 1:1 table match, zero native/MySQL-specific SQL, no enums, no `@ManyToMany`/`@JoinTable`, and only 59 rows of data. The only structural wrinkle is the orphan `product.weight` column; the only real execution risk is forgetting to reset PostgreSQL identity sequences after loading IDs.

No changes were made to project code or the database. This report is for review and approval before any migration work begins.