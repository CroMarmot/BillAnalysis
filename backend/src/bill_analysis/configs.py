from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ba_")

    app_name: str = "bill_analysis"
    db_path: str = "record.db"
    host: str = "0.0.0.0"
    port: int = 5000
    upload_folder: str = "/tmp/bill_analysis/uploads"
    log_folder: str = "log"

    @property
    def log_file_path(self) -> str:
        p = Path(self.log_folder)
        p.mkdir(parents=True, exist_ok=True)
        return str(p / f"{self.app_name}.log")


app_settings = AppSettings()
