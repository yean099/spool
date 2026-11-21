import argparse, collections, datetime, json, time, urllib.request, urllib.error
from pathlib import Path
p = argparse.ArgumentParser(description="Consultas secuenciales para registrar evidencia del servicio; no es una prueba de carga.")
p.add_argument("url", nargs="?", default="http://127.0.0.1:8080/pedidos", help="URL de consulta; por defecto http://127.0.0.1:8080/pedidos")
p.add_argument("--peticiones", type=int, default=10)
p.add_argument("--esperadas", default="", help="IDs esperados separados por coma; vacío no impone una lista")
p.add_argument("--salida", default="evidencias/prueba.json")
a = p.parse_args()
if not 1 <= a.peticiones <= 100: p.error("Use entre 1 y 100 consultas secuenciales")
rows=[]
for i in range(a.peticiones):
    start=time.monotonic()
    row={"consulta":i+1,"fecha_utc":datetime.datetime.now(datetime.timezone.utc).isoformat()}
    try:
        with urllib.request.urlopen(a.url,timeout=5) as r:
            raw=r.read();row["http"]=r.status
        data=json.loads(raw);row["instancia"]=data.get("instancia");row["version"]=data.get("version",data.get("version_datos"))
    except urllib.error.HTTPError as e: row.update(http=e.code,error=str(e))
    except (OSError,ValueError) as e: row.update(http=None,error=str(e))
    row["milisegundos"]=round((time.monotonic()-start)*1000,2);rows.append(row)
observed=sorted({r["instancia"] for r in rows if r.get("instancia") and r.get("http")==200})
expected=sorted({x.strip() for x in a.esperadas.split(",") if x.strip()})
ok=all(r.get("http")==200 for r in rows) and (not expected or observed==expected)
result={"url":a.url,"resultado":"CUMPLE" if ok else "REVISAR","instancias_observadas":observed,"instancias_esperadas":expected,"consultas":rows}
target=Path(a.salida)
if target.exists(): p.error("La salida ya existe. Use otro nombre para conservar la evidencia anterior")
target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps({k:v for k,v in result.items() if k!="consultas"},ensure_ascii=False,indent=2))
print("Evidencia guardada en",target)
raise SystemExit(0 if ok else 1)
