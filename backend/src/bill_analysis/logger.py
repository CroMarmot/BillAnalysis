import logging
import logging.handlers


class ColoredFormatter(logging.Formatter):
    COLORS: dict[str, str] = {
        "DEBUG": "\033[36m",
        "INFO": "\033[32m",
        "WARNING": "\033[33m",
        "ERROR": "\033[31m",
        "CRITICAL": "\033[35m",
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        levelname = record.levelname
        if levelname in self.COLORS:
            record.levelname = f"{self.COLORS[levelname]}{levelname}{self.RESET}"
        return super().format(record)


def create_logger(app_name: str, log_file_path: str) -> None:
    app_logger = logging.getLogger(app_name)
    if app_logger.handlers:
        return
    app_logger.propagate = False
    app_logger.setLevel(logging.DEBUG)

    fh = logging.handlers.RotatingFileHandler(
        log_file_path,
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(
        logging.Formatter(
            "%(asctime)s.%(msecs)03d %(name)s [%(filename)s:%(lineno)s - %(funcName)s() ] - %(levelname)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        ),
    )
    app_logger.addHandler(fh)

    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(
        ColoredFormatter(
            fmt="%(levelname)s:\t%(asctime)s.%(msecs)03d [%(filename)s:%(lineno)s]: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        ),
    )
    app_logger.addHandler(ch)
