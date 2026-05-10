import sqlite3
import os

_connection = None


def get_db() -> sqlite3.Connection:
    global _connection
    if _connection is None:
        db_path = os.getenv("DATABASE_PATH", "learnpilot.db")
        _connection = sqlite3.connect(db_path, check_same_thread=False)
        _connection.row_factory = sqlite3.Row
        _connection.execute("PRAGMA journal_mode=WAL")
        _connection.execute("PRAGMA foreign_keys=ON")
    return _connection


def reset_db():
    """Close connection and reset singleton (used for testing)."""
    global _connection
    if _connection is not None:
        _connection.close()
        _connection = None


def init_db():
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            username        TEXT NOT NULL UNIQUE,
            hashed_password TEXT NOT NULL,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS goals (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER,
            title         TEXT NOT NULL,
            description   TEXT,
            daily_hours   REAL NOT NULL,
            duration_weeks INTEGER NOT NULL,
            skill_level   TEXT NOT NULL,
            status        TEXT DEFAULT 'active',
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS phases (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            goal_id       INTEGER NOT NULL REFERENCES goals(id),
            title         TEXT NOT NULL,
            description   TEXT,
            sort_order    INTEGER NOT NULL,
            week_start    INTEGER NOT NULL,
            week_end      INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            phase_id      INTEGER NOT NULL REFERENCES phases(id),
            goal_id       INTEGER NOT NULL REFERENCES goals(id),
            title         TEXT NOT NULL,
            description   TEXT,
            task_date     DATE NOT NULL,
            task_type     TEXT DEFAULT 'learn',
            status        TEXT DEFAULT 'pending',
            completed_at  DATETIME,
            sort_order    INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            goal_id       INTEGER NOT NULL,
            task_id       INTEGER,
            role          TEXT NOT NULL,
            content       TEXT NOT NULL,
            agent_type    TEXT,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)
    db.commit()
