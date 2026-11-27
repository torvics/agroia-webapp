"""Datos compartidos por las pruebas unitarias de AgroIA."""

# Contraseña de los usuarios base (cumple el mínimo de 12 caracteres).
PASSWORD = "Clave-de-pruebas-2026"

# Usuarios base que existen al iniciar cada prueba.
ADMIN = 1
ADMIN_2 = 2
AGRICULTOR = 3
OTRO_AGRICULTOR = 4

USUARIOS_BASE = (
    (ADMIN, "Admin Principal", "admin"),
    (ADMIN_2, "Admin Secundario", "admin"),
    (AGRICULTOR, "Ana Agricultora", "agricultor"),
    (OTRO_AGRICULTOR, "Beto Agricultor", "agricultor"),
)


def correo_de(usuario_id):
    return f"usuario{usuario_id}@example.test"


def alterar_firma(token):
    """Cambia un carácter interior de la firma de un token firmado.

    No se altera el último carácter: en base64 sus 2 bits finales no se usan,
    por lo que el token podría seguir siendo válido y la prueba sería inestable.
    """
    posicion = len(token) - 5
    sustituto = "A" if token[posicion] != "A" else "B"
    return token[:posicion] + sustituto + token[posicion + 1:]
