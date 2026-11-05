"""Agregar confirmación de correo a usuarios."""

from alembic import op
import sqlalchemy as sa


revision = "4b7f2c1a9d10"
down_revision = "3c38d8f99157"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "usuarios",
        sa.Column(
            "correo_confirmado",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.alter_column("usuarios", "correo_confirmado", server_default=None)


def downgrade():
    op.drop_column("usuarios", "correo_confirmado")
