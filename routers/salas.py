from fastapi import APIRouter, HTTPException

from db import get_connection

router = APIRouter()


@router.get("/salas")
def listar_salas():
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, nome FROM salas ORDER BY id")
        return cursor.fetchall()
    finally:
        cursor.close()
        connection.close()


def seed_salas():
    connection = get_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM salas")
        total = cursor.fetchone()[0]
        if total == 0:
            cursor.executemany(
                "INSERT INTO salas (nome) VALUES (%s)",
                [
                    ("Sala 101",),
                    ("Sala 102",),
                    ("Laboratório 1",),
                    ("Auditório",),
                ],
            )
            connection.commit()
    finally:
        cursor.close()
        connection.close()
