FROM python:3-slim
WORKDIR /app
COPY app.py /app/app.py
COPY pedidos.json /data/pedidos.json
ENV DATA_PATH=/data/pedidos.json PYTHONUNBUFFERED=1
USER 10001
EXPOSE 8080
CMD ["python", "app.py"]
