import logging
import time

from fastapi import FastAPI
from fastapi.routing import APIRoute
from starlette.middleware.cors import CORSMiddleware

from bill_analysis.api.router import router as bill_router
from bill_analysis.configs import app_settings
from bill_analysis.logger import create_logger
from bill_analysis.migration import run_migrations

create_logger(app_settings.app_name, app_settings.log_file_path)
logger = logging.getLogger(app_settings.app_name)
SLOW_THRESHOLD_MS = 1000


def custom_generate_unique_id(route: APIRoute) -> str:
    return "-".join([str(tag) for tag in route.tags] + [route.name])


app = FastAPI(generate_unique_id_function=custom_generate_unique_id)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def timing_middleware(request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    method = request.method
    path = request.url.path
    if elapsed_ms >= SLOW_THRESHOLD_MS:
        logger.warning("%s %s took %.0f ms", method, path, elapsed_ms)
    else:
        logger.info("%s %s took %.0f ms", method, path, elapsed_ms)
    return response


app.include_router(bill_router, prefix="/api", tags=["bill"])


@app.on_event("startup")
def on_startup() -> None:
    run_migrations(app_settings.db_path)



def cli() -> None:
    import uvicorn

    uvicorn.run(
        "bill_analysis.main:app",
        host=app_settings.host,
        port=app_settings.port,
        reload=True,
    )


if __name__ == "__main__":
    cli()
