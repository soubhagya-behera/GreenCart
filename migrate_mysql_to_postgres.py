import mysql.connector
import psycopg2
from psycopg2 import sql

# ============================================================
# CONFIGURATION
# ============================================================

MYSQL_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": input("Enter MySQL password: "),
    "database": "greencart",
}

POSTGRES_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": input("Enter PostgreSQL password: "),
    "database": "greencart",
}

# Parent tables must be migrated before child tables.
TABLE_ORDER = [
    "users",
    "product",
    "cart",
    "coupon",
    "notification",
    "recipe",
    "orders",
    "cart_item",
    "order_item",
    "product_image",
    "recipe_ingredients",
    "review",
    "wishlist",
]

# ============================================================
# CONNECTIONS
# ============================================================

print("\nConnecting to MySQL...")

mysql_conn = mysql.connector.connect(**MYSQL_CONFIG)
mysql_cursor = mysql_conn.cursor(dictionary=True)

print("MySQL connected.")

print("Connecting to PostgreSQL...")

pg_conn = psycopg2.connect(**POSTGRES_CONFIG)
pg_cursor = pg_conn.cursor()

print("PostgreSQL connected.\n")


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_mysql_columns(table):
    mysql_cursor.execute(f"SHOW COLUMNS FROM `{table}`")
    return [row["Field"] for row in mysql_cursor.fetchall()]


def get_postgres_columns(table):
    pg_cursor.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
        ORDER BY ordinal_position
        """,
        (table,)
    )

    return [row[0] for row in pg_cursor.fetchall()]


def get_postgres_column_types(table):
    pg_cursor.execute(
        """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
        """,
        (table,)
    )

    return dict(pg_cursor.fetchall())


def convert_value(value, postgres_type):
    if value is None:
        return None

    # MySQL BIT(1) commonly arrives as bytes.
    # PostgreSQL expects boolean.
    if postgres_type == "boolean":
        if isinstance(value, bytes):
            return value != b"\x00"

        if isinstance(value, int):
            return value != 0

        if isinstance(value, str):
            return value.lower() in ("1", "true", "t", "yes")

    return value


# ============================================================
# MIGRATION
# ============================================================

try:

    total_rows = 0

    for table in TABLE_ORDER:

        print("=" * 60)
        print(f"Migrating table: {table}")

        mysql_columns = get_mysql_columns(table)
        postgres_columns = get_postgres_columns(table)
        postgres_types = get_postgres_column_types(table)

        if not postgres_columns:
            raise Exception(
                f"PostgreSQL table '{table}' does not exist."
            )

        # Use only columns existing in BOTH databases.
        #
        # This automatically ignores the MySQL-only:
        # product.weight
        #
        common_columns = [
            column
            for column in mysql_columns
            if column in postgres_columns
        ]

        if not common_columns:
            print(f"No common columns found for {table}. Skipping.")
            continue

        mysql_column_sql = ", ".join(
            f"`{column}`" for column in common_columns
        )

        mysql_cursor.execute(
            f"SELECT {mysql_column_sql} FROM `{table}`"
        )

        rows = mysql_cursor.fetchall()

        print(f"MySQL rows found: {len(rows)}")

        if not rows:
            print("Nothing to migrate.")
            continue

        # Insert into PostgreSQL
        columns_sql = sql.SQL(", ").join(
            sql.Identifier(column)
            for column in common_columns
        )

        placeholders = sql.SQL(", ").join(
            sql.Placeholder()
            for _ in common_columns
        )

        insert_query = sql.SQL(
            "INSERT INTO {} ({}) VALUES ({})"
        ).format(
            sql.Identifier(table),
            columns_sql,
            placeholders
        )

        migrated = 0

        for row in rows:

            values = []

            for column in common_columns:

                value = row[column]

                postgres_type = postgres_types.get(column)

                value = convert_value(
                    value,
                    postgres_type
                )

                values.append(value)

            pg_cursor.execute(
                insert_query,
                values
            )

            migrated += 1

        total_rows += migrated

        print(f"Inserted into PostgreSQL: {migrated}")

    # ========================================================
    # COMMIT
    # ========================================================

    pg_conn.commit()

    print("\n" + "=" * 60)
    print("DATA MIGRATION COMPLETED")
    print("=" * 60)

    print(f"Total rows migrated: {total_rows}")

    # ========================================================
    # RESET IDENTITY SEQUENCES
    # ========================================================

    print("\nResetting PostgreSQL identity sequences...")

    for table in TABLE_ORDER:

        # Check whether an id column exists.
        pg_cursor.execute(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = %s
                  AND column_name = 'id'
            )
            """,
            (table,)
        )

        has_id = pg_cursor.fetchone()[0]

        if not has_id:
            continue

        pg_cursor.execute(
            sql.SQL(
                """
                SELECT setval(
                    pg_get_serial_sequence({}, 'id'),
                    COALESCE(MAX(id), 1),
                    MAX(id) IS NOT NULL
                )
                FROM {}
                """
            ).format(
                sql.Literal(f"public.{table}"),
                sql.Identifier(table)
            )
        )

        result = pg_cursor.fetchone()

        print(f"{table}: sequence reset -> {result[0] if result else 'N/A'}")

    pg_conn.commit()

    # ========================================================
    # VERIFY ROW COUNTS
    # ========================================================

    print("\n" + "=" * 60)
    print("ROW COUNT VERIFICATION")
    print("=" * 60)

    verification_failed = False

    for table in TABLE_ORDER:

        mysql_cursor.execute(
            f"SELECT COUNT(*) AS count FROM `{table}`"
        )

        mysql_count = mysql_cursor.fetchone()["count"]

        pg_cursor.execute(
            sql.SQL("SELECT COUNT(*) FROM {}").format(
                sql.Identifier(table)
            )
        )

        pg_count = pg_cursor.fetchone()[0]

        status = "OK" if mysql_count == pg_count else "MISMATCH"

        print(
            f"{table:25} "
            f"MySQL={mysql_count:<5} "
            f"PostgreSQL={pg_count:<5} "
            f"{status}"
        )

        if mysql_count != pg_count:
            verification_failed = True

    print("\n" + "=" * 60)

    if verification_failed:
        print("WARNING: Some row counts do not match.")
    else:
        print("SUCCESS: All row counts match.")

    print("=" * 60)


except Exception as e:

    print("\n" + "=" * 60)
    print("MIGRATION FAILED")
    print("=" * 60)

    print(str(e))

    print("\nRolling back PostgreSQL transaction...")

    pg_conn.rollback()

    raise


finally:

    mysql_cursor.close()
    mysql_conn.close()

    pg_cursor.close()
    pg_conn.close()

    print("\nDatabase connections closed.")