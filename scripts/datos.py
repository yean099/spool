from pathlib import Path
import argparse, datetime, hashlib, json, shutil, sys
ROOT = Path(__file__).resolve().parents[1]
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def stamp(): return datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
def inside(p, parent):
    p = p.resolve()
    if p == parent.resolve() or parent.resolve() not in p.parents:
        raise ValueError("La ruta debe estar dentro de " + str(parent))
    return p

WORK = ROOT / "data" / "pedidos.json"
def validate(p):
    data = json.loads(p.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not isinstance(data.get("pedidos"), list) or not data.get("version"):
        raise ValueError("Se requiere un objeto JSON con version y lista pedidos")
parser = argparse.ArgumentParser(description="Preparar, respaldar y restaurar datos ficticios de Nodo Ruta.")
parser.add_argument("accion", choices=["preparar", "respaldar", "simular-error", "restaurar"])
parser.add_argument("--respaldo", help="Archivo JSON dentro de respaldos creado por este script")
args = parser.parse_args()
try:
    inside(WORK, ROOT)
    if args.accion == "preparar":
        if WORK.exists(): raise ValueError("La copia data/pedidos.json ya existe; no se sobrescribe")
        validate(ROOT / "pedidos.json")
        WORK.parent.mkdir(exist_ok=True)
        shutil.copy2(ROOT / "pedidos.json", WORK)
        print("Datos de trabajo preparados. Configure el despliegue para usar data/pedidos.json.")
    elif not WORK.is_file(): raise ValueError("Ejecute primero: python scripts/datos.py preparar")
    elif args.accion == "respaldar":
        validate(WORK)
        target = inside(ROOT / "respaldos" / (stamp() + ".json"), ROOT / "respaldos")
        target.parent.mkdir(exist_ok=True)
        shutil.copy2(WORK, target)
        target.with_suffix(".sha256").write_text(digest(target), encoding="utf-8")
        print("Respaldo creado: " + str(target.relative_to(ROOT)))
    elif args.accion == "simular-error":
        WORK.write_text("{ error simulado: JSON incompleto", encoding="utf-8")
        print("La copia de trabajo ahora es inválida. /health debe devolver 503 si usa esa copia.")
    elif args.accion == "restaurar":
        if not args.respaldo: raise ValueError("Indique --respaldo con la ruta que recibió al respaldar")
        source = inside(ROOT / args.respaldo, ROOT / "respaldos")
        if source.suffix != ".json": raise ValueError("Seleccione el archivo JSON del respaldo")
        if digest(source) != source.with_suffix(".sha256").read_text(encoding="utf-8").strip():
            raise ValueError("El respaldo no coincide con su huella de integridad")
        validate(source)
        # Sobrescribir el mismo archivo mantiene el montaje de archivo del ejemplo.
        # El laboratorio es de consulta; durante esta escritura puede haber un 503 breve.
        WORK.write_bytes(source.read_bytes())
        print("Datos restaurados. Verifique /health, /pedidos, version y contenido.")
except (ValueError, OSError, KeyError) as e:
    parser.exit(1, "No se realizó la operación: " + str(e) + "\n")
