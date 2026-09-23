from datetime import date, time
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from db import get_connection

router = APIRouter()


class ReservaCreate(BaseModel):
    sala_id: int = Field(..., gt=0)
    data_reserva: date
    inicio: time
    fim: time
    reservante: str = Field(..., min_length=1, max_length=150)


@router.get("/reserva_sala")
def listar_reservas(
    status_filtro: Optional[str] = Query(default=None, alias="status")
):
    if status_filtro is not None and status_filtro not in ("Ativo", "Cancelado"):
        raise HTTPException(status_code=400, detail="Status inválido.")

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        query = """
            SELECT id, sala_id, data_reserva, inicio, fim, reservante,
                   status, criado, cancelado
            FROM reserva_sala
        """
        parameters = []
        if status_filtro is not None:
            query += " WHERE status = %s"
            parameters.append(status_filtro)
        query += " ORDER BY data_reserva, inicio, id"
        cursor.execute(query, parameters)
        return cursor.fetchall()
    finally:
        cursor.close()
        connection.close()


@router.post("/reserva_sala", status_code=status.HTTP_201_CREATED)
def criar_reserva(reserva: ReservaCreate):
    if reserva.inicio >= reserva.fim:
        raise HTTPException(
            status_code=400,
            detail="O horário de início deve ser anterior ao horário de término.",
        )

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id FROM salas WHERE id = %s",
            (reserva.sala_id,),
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=400, detail="Sala inválida.")

        cursor.execute(
            """
            SELECT id
            FROM reserva_sala
            WHERE sala_id = %s
              AND data_reserva = %s
              AND status = 'Ativo'
              AND inicio < %s
              AND fim > %s
            LIMIT 1
            """,
            (
                reserva.sala_id,
                reserva.data_reserva,
                reserva.fim,
                reserva.inicio,
            ),
        )
        if cursor.fetchone() is not None:
            raise HTTPException(
                status_code=409,
                detail="Já existe uma reserva ativa para esta sala nesse horário.",
            )

        cursor.execute(
            """
            INSERT INTO reserva_sala
                (sala_id, data_reserva, inicio, fim, reservante)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                reserva.sala_id,
                reserva.data_reserva,
                reserva.inicio,
                reserva.fim,
                reserva.reservante,
            ),
        )
        connection.commit()
        reserva_id = cursor.lastrowid
        return {"id": reserva_id, **reserva.model_dump(mode="json"), "status": "Ativo"}
    finally:
        cursor.close()
        connection.close()


@router.patch("/reserva_sala/{reserva_id}/cancelar")
def cancelar_reserva(reserva_id: int):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, status FROM reserva_sala WHERE id = %s",
            (reserva_id,),
        )
        reserva = cursor.fetchone()
        if reserva is None:
            raise HTTPException(status_code=404, detail="Reserva não encontrada.")
        if reserva["status"] == "Cancelado":
            raise HTTPException(status_code=400, detail="A reserva já está cancelada.")

        cursor.execute(
            """
            UPDATE reserva_sala
            SET status = 'Cancelado', cancelado = NOW()
            WHERE id = %s
            """,
            (reserva_id,),
        )
        connection.commit()
        return {"id": reserva_id, "status": "Cancelado"}
    finally:
        cursor.close()
        connection.close()
