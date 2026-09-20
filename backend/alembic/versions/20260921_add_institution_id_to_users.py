"""add institution_id to users

Revision ID: 20260921_users_institution
Revises: f7b8c9d0e1f2
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260921_users_institution"
down_revision: Union[str, Sequence[str], None] = "f7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    user_columns = {
        column["name"] for column in inspector.get_columns("users")
    }

    if "institution_id" not in user_columns:
        op.add_column(
            "users",
            sa.Column("institution_id", sa.Integer(), nullable=True),
        )

    foreign_keys = inspector.get_foreign_keys("users")
    has_institution_foreign_key = any(
        foreign_key.get("constrained_columns") == ["institution_id"]
        and foreign_key.get("referred_table") == "institutions"
        for foreign_key in foreign_keys
    )

    if not has_institution_foreign_key:
        op.create_foreign_key(
            "fk_users_institution_id_institutions",
            "users",
            "institutions",
            ["institution_id"],
            ["id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    foreign_keys = inspector.get_foreign_keys("users")

    if any(
        foreign_key.get("name") == "fk_users_institution_id_institutions"
        for foreign_key in foreign_keys
    ):
        op.drop_constraint(
            "fk_users_institution_id_institutions",
            "users",
            type_="foreignkey",
        )

    user_columns = {
        column["name"] for column in inspector.get_columns("users")
    }
    if "institution_id" in user_columns:
        op.drop_column("users", "institution_id")
