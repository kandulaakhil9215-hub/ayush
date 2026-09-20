from fastapi import APIRouter
from sqlalchemy import text

from app.db.database import engine


router = APIRouter()


@router.get("/database")
def database_test():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT version()"))
        version = result.scalar()

    return {
        "status": "connected",
        "database": "PostgreSQL",
        "version": version,
    }