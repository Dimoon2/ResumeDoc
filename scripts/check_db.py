from sqlalchemy import inspect, text

from db.engine import engine


def main() -> None:
    with engine.connect() as connection:
        version = connection.execute(text("SELECT version()")).scalar_one()
        print(f"Conectado a: {version}")

        tables = inspect(connection).get_table_names()
        print(f"Tablas: {tables if tables else '(ninguna todavía)'}")


if __name__ == "__main__":
    main()
