
"""Crear tablas base de AgroIA.

Revision ID: b0a5e0000001
Revises:
"""

from alembic import op
import sqlalchemy as sa

revision = "b0a5e0000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Usuarios
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column("correo", sa.String(150), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("rol", sa.String(10), nullable=False),
        sa.Column("fecha_creacion", sa.DateTime(), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=True),
        sa.UniqueConstraint("correo"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Parcelas
    op.create_table(
        "parcelas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column("ubicacion", sa.String(150), nullable=True),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["usuario_id"], ["usuarios.id"]
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Nodos
    # La columna "tipo" será agregada en
    # la migración 89656f73a5ef.
    op.create_table(
        "nodos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("parcela_id", sa.Integer(), nullable=False),
        sa.Column("identificador", sa.String(50), nullable=False),
        sa.Column("api_key", sa.String(255), nullable=False),
        sa.Column("estado", sa.String(13), nullable=True),
        sa.ForeignKeyConstraint(
            ["parcela_id"], ["parcelas.id"]
        ),
        sa.UniqueConstraint("identificador"),
        sa.UniqueConstraint("api_key"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Comandos pendientes
    op.create_table(
        "comandos_pendientes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nodo_id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("tipo_comando", sa.String(5), nullable=False),
        sa.Column("valor", sa.String(50), nullable=False),
        sa.Column("ejecutado", sa.Boolean(), nullable=True),
        sa.Column("fecha_creacion", sa.DateTime(), nullable=True),
        sa.Column("fecha_ejecucion", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["nodo_id"], ["nodos.id"]
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"], ["usuarios.id"]
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Bitácora
    op.create_table(
        "bitacora",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("accion", sa.String(255), nullable=False),
        sa.Column("nodo_id", sa.Integer(), nullable=True),
        sa.Column("fecha", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["usuario_id"], ["usuarios.id"]
        ),
        sa.ForeignKeyConstraint(
            ["nodo_id"], ["nodos.id"]
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("bitacora")
    op.drop_table("comandos_pendientes")
    op.drop_table("nodos")
    op.drop_table("parcelas")
    op.drop_table("usuarios")
