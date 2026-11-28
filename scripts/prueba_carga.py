"""Prueba de carga sencilla: simula N usuarios concurrentes durante X segundos.

Solo usa la biblioteca estándar de Python. Cada "usuario" es un hilo que hace
consultas seguidas (con una pausa opcional entre ellas) y registra el código
HTTP, la instancia que respondió y la latencia.

Ejemplos:
  python scripts/prueba_carga.py --usuarios 20 --segundos 30 --salida evidencias/carga_2inst.json
  python scripts/prueba_carga.py --usuarios 50 --segundos 60 --pausa 0.1 --salida evidencias/carga_50u.json
"""
import argparse
import collections
import datetime
import json
import statistics
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
p.add_argument("url", nargs="?", default="http://127.0.0.1:8080/pedidos")
p.add_argument("--usuarios", type=int, default=10, help="usuarios concurrentes (hilos)")
p.add_argument("--segundos", type=float, default=20, help="duración de la prueba")
p.add_argument("--pausa", type=float, default=0.0, help="segundos de 'pensar' entre consultas de cada usuario")
p.add_argument("--timeout", type=float, default=5.0)
p.add_argument("--salida", default="evidencias/carga.json")
a = p.parse_args()
if not 1 <= a.usuarios <= 500:
    p.error("Use entre 1 y 500 usuarios")

target = Path(a.salida)
if target.exists():
    p.error("La salida ya existe. Use otro nombre para conservar la evidencia anterior")

lock = threading.Lock()
rows = []  # (t_relativo, http, instancia, ms)
t0 = time.monotonic()
fin = t0 + a.segundos


def usuario():
    while time.monotonic() < fin:
        start = time.monotonic()
        http, inst = None, None
        try:
            with urllib.request.urlopen(a.url, timeout=a.timeout) as r:
                raw = r.read()
                http = r.status
            inst = json.loads(raw).get("instancia")
        except urllib.error.HTTPError as e:
            http = e.code
        except (OSError, ValueError):
            http = None
        ms = (time.monotonic() - start) * 1000
        with lock:
            rows.append((round(start - t0, 3), http, inst, round(ms, 2)))
        if a.pausa:
            time.sleep(a.pausa)


hilos = [threading.Thread(target=usuario, daemon=True) for _ in range(a.usuarios)]
for h in hilos:
    h.start()
for h in hilos:
    h.join()
duracion = time.monotonic() - t0


def pct(vals, q):
    if not vals:
        return None
    vals = sorted(vals)
    k = max(0, min(len(vals) - 1, round(q / 100 * (len(vals) - 1))))
    return vals[k]


ok = [r for r in rows if r[1] == 200]
lat = [r[3] for r in ok]
errores = collections.Counter(str(r[1]) for r in rows if r[1] != 200)
por_inst = collections.Counter(r[2] for r in ok)

# Serie por segundo: cuántas OK y cuántas fallidas hubo en cada segundo
serie = collections.defaultdict(lambda: {"ok": 0, "error": 0})
for t, http, _, _ in rows:
    serie[int(t)]["ok" if http == 200 else "error"] += 1

resumen = {
    "url": a.url,
    "fecha_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "usuarios": a.usuarios,
    "segundos": round(duracion, 2),
    "pausa": a.pausa,
    "total_peticiones": len(rows),
    "exitosas": len(ok),
    "tasa_error_%": round(100 * (len(rows) - len(ok)) / len(rows), 2) if rows else None,
    "errores": dict(errores),
    "peticiones_por_segundo": round(len(ok) / duracion, 1),
    "latencia_ms": {
        "media": round(statistics.mean(lat), 1) if lat else None,
        "p50": pct(lat, 50),
        "p95": pct(lat, 95),
        "p99": pct(lat, 99),
        "max": max(lat) if lat else None,
    },
    "reparto_por_instancia": dict(por_inst),
}
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(
    json.dumps({**resumen, "serie_por_segundo": {k: serie[k] for k in sorted(serie)}}, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
print(json.dumps(resumen, ensure_ascii=False, indent=2))
print("Evidencia guardada en", target)
