"""add attendance session lifecycle fields (status, started_at, ended_at, late_threshold_minutes)

Revision ID: b1c2d3e4f5a6
Revises: 50a64e57dca4
Create Date: 2026-07-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "b1c2d3e4f5a6"
down_revision = "50a64e57dca4"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "attendance_session",
        sa.Column("status", sa.String(length=20), server_default="created", nullable=False),
    )
    op.add_column(
        "attendance_session",
        sa.Column("started_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "attendance_session",
        sa.Column("ended_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "attendance_session",
        sa.Column(
            "late_threshold_minutes",
            sa.Integer(),
            server_default="15",
            nullable=False,
        ),
    )


def downgrade():
    op.drop_column("attendance_session", "late_threshold_minutes")
    op.drop_column("attendance_session", "ended_at")
    op.drop_column("attendance_session", "started_at")
    op.drop_column("attendance_session", "status")
