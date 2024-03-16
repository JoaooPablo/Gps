import psycopg2

# Parámetros de conexión a la base de datos
db_params = {
    'user': 'postgres',
    'password': 'admin',
    'host': 'localhost',
    'port': 5432,
    'database': 'postgres'
}

# Nombre de la tabla
table_name = 'data'

# Definir la estructura de la tabla
table_creation_query = f"""
    CREATE TABLE IF NOT EXISTS {table_name} (
        id SERIAL PRIMARY KEY,
        latitud DOUBLE PRECISION,
        longitud DOUBLE PRECISION,
        fecha DATE,
        tiemstamp TIME
    );
"""

# Intentar establecer la conexión y crear la tabla
try:
    connection = psycopg2.connect(**db_params)
    cursor = connection.cursor()

    # Crear la tabla
    cursor.execute(table_creation_query)

    # Confirmar la transacción
    connection.commit()

    print(f"Tabla '{table_name}' creada correctamente.")

except psycopg2.Error as e:
    print(f"Error al conectar a PostgreSQL o al crear la tabla: {e}")

finally:
    # Cerrar la conexión
    if connection:
        cursor.close()
        connection.close()
        print("Conexión cerrada.")
