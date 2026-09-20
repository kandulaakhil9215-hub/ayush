"""enhance skill verification workflow

Revision ID: f7b8c9d0e1f2
Revises: 45ec9d2cdadf
Create Date: 2026-09-13 23:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# ============================================================
# REVISION
# ============================================================

revision: str = "f7b8c9d0e1f2"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "45ec9d2cdadf"

branch_labels: Union[
    str,
    Sequence[str],
    None,
] = None

depends_on: Union[
    str,
    Sequence[str],
    None,
] = None


# ============================================================
# UPGRADE
# ============================================================

def upgrade() -> None:

    # --------------------------------------------------------
    # Enhanced verification fields
    # --------------------------------------------------------

    op.add_column(
        "student_skills",
        sa.Column(
            "verification_status",
            sa.String(length=30),
            nullable=False,
            server_default="PENDING",
        ),
    )

    op.add_column(
        "student_skills",
        sa.Column(
            "rejection_reason",
            sa.Text(),
            nullable=True,
        ),
    )

    op.add_column(
        "student_skills",
        sa.Column(
            "evidence_url",
            sa.String(length=1000),
            nullable=True,
        ),
    )

    op.add_column(
        "student_skills",
        sa.Column(
            "review_due_at",
            sa.DateTime(),
            nullable=True,
        ),
    )

    op.add_column(
        "student_skills",
        sa.Column(
            "verification_expires_at",
            sa.DateTime(),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_student_skills_verification_status",
        "student_skills",
        ["verification_status"],
    )

    # --------------------------------------------------------
    # Verification history
    # --------------------------------------------------------

    op.create_table(
        "skill_verification_history",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
        ),

        sa.Column(
            "student_skill_id",
            sa.Integer(),
            sa.ForeignKey(
                "student_skills.id",
                ondelete="CASCADE",
            ),
            nullable=False,
        ),

        sa.Column(
            "student_id",
            sa.Integer(),
            sa.ForeignKey(
                "students.id",
                ondelete="CASCADE",
            ),
            nullable=False,
        ),

        sa.Column(
            "skill_id",
            sa.Integer(),
            sa.ForeignKey(
                "skills.id",
                ondelete="CASCADE",
            ),
            nullable=False,
        ),

        sa.Column(
            "verified_by",
            sa.Integer(),
            sa.ForeignKey(
                "users.id",
                ondelete="SET NULL",
            ),
            nullable=True,
        ),

        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
        ),

        sa.Column(
            "score",
            sa.Float(),
            nullable=True,
        ),

        sa.Column(
            "verification_source",
            sa.String(length=50),
            nullable=True,
        ),

        sa.Column(
            "verification_notes",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "rejection_reason",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "evidence_url",
            sa.String(length=1000),
            nullable=True,
        ),

        sa.Column(
            "review_due_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "verification_expires_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_index(
        "ix_skill_verification_history_student_skill_id",
        "skill_verification_history",
        ["student_skill_id"],
    )

    op.create_index(
        "ix_skill_verification_history_student_id",
        "skill_verification_history",
        ["student_id"],
    )

    op.create_index(
        "ix_skill_verification_history_skill_id",
        "skill_verification_history",
        ["skill_id"],
    )

    op.create_index(
        "ix_skill_verification_history_status",
        "skill_verification_history",
        ["status"],
    )

    # --------------------------------------------------------
    # Preserve existing verified records
    # --------------------------------------------------------

    op.execute(
        """
        UPDATE student_skills
        SET verification_status =
            CASE
                WHEN verified = TRUE
                THEN 'VERIFIED'
                ELSE 'PENDING'
            END
        """
    )

    # Remove temporary database default.
    op.alter_column(
        "student_skills",
        "verification_status",
        server_default=None,
    )


# ============================================================
# DOWNGRADE
# ============================================================

def downgrade() -> None:

    op.drop_index(
        "ix_skill_verification_history_status",
        table_name="skill_verification_history",
    )

    op.drop_index(
        "ix_skill_verification_history_skill_id",
        table_name="skill_verification_history",
    )

    op.drop_index(
        "ix_skill_verification_history_student_id",
        table_name="skill_verification_history",
    )

    op.drop_index(
        "ix_skill_verification_history_student_skill_id",
        table_name="skill_verification_history",
    )

    op.drop_table(
        "skill_verification_history"
    )

    op.drop_index(
        "ix_student_skills_verification_status",
        table_name="student_skills",
    )

    op.drop_column(
        "student_skills",
        "verification_expires_at",
    )

    op.drop_column(
        "student_skills",
        "review_due_at",
    )

    op.drop_column(
        "student_skills",
        "evidence_url",
    )

    op.drop_column(
        "student_skills",
        "rejection_reason",
    )

    op.drop_column(
        "student_skills",
        "verification_status",
    )