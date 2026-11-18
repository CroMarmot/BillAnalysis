import logging
import sqlite3

logger = logging.getLogger("bill_analysis.migration")
DB_VERSION = 9

CONFIG_TABLE = "_config"


def _ensure_config_table(con: sqlite3.Connection) -> None:
    con.execute(f"CREATE TABLE IF NOT EXISTS {CONFIG_TABLE} (key TEXT PRIMARY KEY, value TEXT)")
    con.commit()


def _get_db_version(con: sqlite3.Connection) -> int:
    _ensure_config_table(con)
    cur = con.execute(f"SELECT value FROM {CONFIG_TABLE} WHERE key='db_version'")
    row = cur.fetchone()
    if row:
        try:
            return int(row[0])
        except ValueError:
            return 0
    return 0


def _set_db_version(con: sqlite3.Connection, version: int) -> None:
    con.execute(
        f"INSERT OR REPLACE INTO {CONFIG_TABLE} (key, value) VALUES ('db_version', ?)",
        (str(version),),
    )
    con.commit()


def _migrate_8_to_9(con: sqlite3.Connection) -> bool:
    logger.info("Migration 8->9: adding index on tags.user_id")
    try:
        con.execute("CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id)")
        con.commit()
        logger.info("  Created idx_tags_user_id index")
        return True
    except Exception:
        logger.exception("Migration 8->9 failed")
        return False


def run_migrations(db_path: str) -> None:
    con = sqlite3.connect(db_path)
    try:
        current_version = _get_db_version(con)
        logger.info(f"DB version: {current_version}, target: {DB_VERSION}")

        while current_version < DB_VERSION:
            target = current_version + 1
            migrate_fn = _migration_map.get(target)
            if migrate_fn is None:
                logger.warning(f"No migration found for {current_version}->{target}")
                break
            try:
                ok = migrate_fn(con)
                if ok:
                    _set_db_version(con, target)
                    logger.info(f"Migration {current_version}->{target} completed")
                    current_version = target
                else:
                    logger.warning(f"Migration {current_version}->{target} returned False, rolling back")
                    con.rollback()
                    break
            except Exception:
                logger.exception(f"Migration {current_version}->{target} failed")
                con.rollback()
                break
    finally:
        con.close()


_migration_map = {
    9: _migrate_8_to_9,
}
