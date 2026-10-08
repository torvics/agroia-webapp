
import csv
import io
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)


def texto(valor):
    return "No disponible" if valor is None else str(valor)


def celda_csv(valor):
    """Evita ejecutar fórmulas al abrir textos en Excel."""
    if isinstance(valor, (int, float)) and not isinstance(valor, bool):
        return valor

    valor = texto(valor)

    if valor.lstrip().startswith(("=", "+", "-", "@")):
        return "'" + valor

    return valor


def generar_csv(reporte):
    """Genera un CSV UTF-8 con los datos del reporte."""

    salida = io.StringIO()
    writer = csv.writer(salida)

    def fila(seccion, indicador, valor, unidad="", detalle=""):
        writer.writerow([
            celda_csv(x)
            for x in (seccion, indicador, valor, unidad, detalle)
        ])

    fila("Seccion", "Indicador", "Valor", "Unidad", "Detalle")

    parcela = reporte["parcela"]
    periodo = reporte["periodo"]

    fila("General", "Parcela ID", parcela["id"])
    fila("General", "Nombre", parcela["nombre"])
    fila("General", "Ubicacion", parcela["ubicacion"])
    fila("General", "Inicio UTC", periodo["inicio"])
    fila("General", "Fin exclusivo UTC", periodo["fin_exclusivo"])

    campos = {
        "humedad_suelo": "%",
        "temp_suelo": "C",
        "temp_ambiente": "C",
        "humedad_ambiente": "%"
    }

    estadisticas = reporte["sensores"]["estadisticas"]

    for campo, unidad in campos.items():
        datos = estadisticas[campo]

        for metrica in ("promedio", "minimo", "maximo"):
            fila("Sensores", f"{campo}_{metrica}",
                 datos[metrica], unidad)

        fila("Sensores", f"{campo}_lecturas",
             datos["lecturas"])

    precipitacion = reporte["sensores"]["precipitacion"]

    fila(
        "Precipitacion",
        "Ultima lectura acumulada",
        precipitacion["lluvia_acum_ultima_lectura_mm"],
        "mm"
    )

    fila(
        "Precipitacion",
        "Total del periodo",
        precipitacion["total_periodo_mm"],
        "mm",
        precipitacion["observacion"]
    )

    consumo = reporte["consumo_agua"]

    fila(
        "Consumo de agua",
        "Volumen utilizado",
        consumo["litros"],
        "litros",
        consumo["observacion"]
    )

    comandos = reporte["eventos"]["comandos"]

    for clave in (
        "ordenes_creadas",
        "ordenes_riego_creadas",
        "comandos_confirmados",
        "riego_confirmado",
        "rele_confirmado"
    ):
        fila("Comandos", clave, comandos[clave])

    fila("Comandos", "Observacion", comandos["observacion"])

    alertas = reporte["eventos"]["alertas"]

    fila("Alertas", "Total", alertas["total"])

    for tipo, cantidad in sorted(alertas["por_tipo"].items()):
        fila("Alertas", tipo, cantidad)

    bitacora = reporte["eventos"]["bitacora"]

    fila("Bitacora", "Total eventos", bitacora["total_eventos"])
    fila("Bitacora", "Eventos incluidos", bitacora["eventos_mostrados"])

    for evento in bitacora["ultimos_eventos"]:
        fila(
            "Bitacora",
            f"Evento {evento['id']}",
            evento["accion"],
            "",
            f"Fecha: {evento['fecha']}; Nodo: {evento['nodo_id']}"
        )

    # BOM para mejorar la compatibilidad con Excel.
    return salida.getvalue().encode("utf-8-sig")


def generar_pdf(reporte):
    """Genera un PDF con resumen, estadísticas y eventos."""

    buffer = io.BytesIO()

    documento = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="Reporte AgroIA"
    )

    estilos = getSampleStyleSheet()

    elementos = []

    def parrafo(valor):
        return Paragraph(escape(texto(valor)), estilos["BodyText"])

    def titulo(valor):
        elementos.append(Paragraph(valor, estilos["Heading2"]))
        elementos.append(Spacer(1, 5 * mm))

    def tabla(filas, anchos):
        contenido = [
            [parrafo(valor) for valor in fila]
            for fila in filas
        ]

        t = Table(
            contenido,
            colWidths=anchos,
            repeatRows=1,
            hAlign="LEFT"
        )

        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8EFE4")),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6)
        ]))

        elementos.append(t)
        elementos.append(Spacer(1, 6 * mm))

    elementos.append(
        Paragraph("AgroIA - Reporte de parcela", estilos["Title"])
    )
    elementos.append(Spacer(1, 7 * mm))

    parcela = reporte["parcela"]
    periodo = reporte["periodo"]

    titulo("Información general")

    tabla([
        ["Campo", "Valor"],
        ["Parcela", parcela["nombre"]],
        ["ID", parcela["id"]],
        ["Ubicación", parcela["ubicacion"]],
        ["Inicio (UTC)", periodo["inicio"]],
        ["Fin exclusivo (UTC)", periodo["fin_exclusivo"]]
    ], [55 * mm, 115 * mm])

    titulo("Estadísticas de sensores")

    filas = [[
        "Sensor", "Promedio", "Mínimo", "Máximo", "Lecturas"
    ]]

    etiquetas = {
        "humedad_suelo": ("Humedad suelo", "%"),
        "temp_suelo": ("Temperatura suelo", "°C"),
        "temp_ambiente": ("Temperatura ambiente", "°C"),
        "humedad_ambiente": ("Humedad ambiente", "%")
    }

    for campo, (nombre, unidad) in etiquetas.items():

        datos = reporte["sensores"]["estadisticas"][campo]

        def valor_medida(v):
            return (
                "No disponible" if v is None
                else f"{v} {unidad}"
            )

        filas.append([
            nombre,
            valor_medida(datos["promedio"]),
            valor_medida(datos["minimo"]),
            valor_medida(datos["maximo"]),
            datos["lecturas"]
        ])

    tabla(
        filas,
        [52 * mm, 32 * mm, 30 * mm, 30 * mm, 26 * mm]
    )

    titulo("Precipitación y consumo de agua")

    lluvia = reporte["sensores"]["precipitacion"]
    consumo = reporte["consumo_agua"]

    tabla([
        ["Indicador", "Resultado"],
        [
            "Última lectura del acumulador",
            f"{texto(lluvia['lluvia_acum_ultima_lectura_mm'])} mm"
        ],
        ["Lluvia total del período", texto(lluvia["total_periodo_mm"])],
        ["Consumo de agua de riego", texto(consumo["litros"])]
    ], [85 * mm, 85 * mm])

    elementos.append(parrafo(lluvia["observacion"]))
    elementos.append(Spacer(1, 3 * mm))
    elementos.append(parrafo(consumo["observacion"]))
    elementos.append(Spacer(1, 6 * mm))

    titulo("Eventos de control")

    comandos = reporte["eventos"]["comandos"]
    bitacora = reporte["eventos"]["bitacora"]

    tabla([
        ["Indicador", "Cantidad"],
        ["Órdenes creadas", comandos["ordenes_creadas"]],
        ["Comandos confirmados", comandos["comandos_confirmados"]],
        ["Comandos de riego confirmados", comandos["riego_confirmado"]],
        ["Comandos de relé confirmados", comandos["rele_confirmado"]],
        ["Eventos de bitácora", bitacora["total_eventos"]]
    ], [110 * mm, 60 * mm])

    elementos.append(parrafo(comandos["observacion"]))
    elementos.append(Spacer(1, 6 * mm))

    titulo("Alertas detectadas")

    alertas = reporte["eventos"]["alertas"]

    filas_alertas = [["Tipo", "Cantidad"]]

    filas_alertas.append(["Total de alertas", alertas["total"]])

    for tipo, cantidad in sorted(alertas["por_tipo"].items()):
        filas_alertas.append([tipo.replace("_", " ").title(), cantidad])

    tabla(filas_alertas, [110 * mm, 60 * mm])

    titulo("Últimos eventos de bitácora")

    eventos = bitacora["ultimos_eventos"]

    if eventos:
        filas_eventos = [["Fecha UTC", "Nodo", "Acción"]]

        for evento in eventos:
            filas_eventos.append([
                evento["fecha"],
                texto(evento["nodo_id"]),
                evento["accion"]
            ])

        tabla(
            filas_eventos,
            [43 * mm, 22 * mm, 105 * mm]
        )
    else:
        elementos.append(parrafo("No hay eventos en este período."))

    elementos.append(Spacer(1, 6 * mm))
    elementos.append(
        parrafo(
            "Reporte generado automáticamente por AgroIA. "
            "Las estadísticas dependen de las lecturas disponibles."
        )
    )

    documento.build(elementos)

    return buffer.getvalue()
