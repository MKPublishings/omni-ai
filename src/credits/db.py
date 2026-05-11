# db.py
# Ionirix Credit Ledger Database Layer
# Author: Mirnes Kudić

import sqlite3
from decimal import Decimal
import threading
import json
import time
from typing import Optional, Dict, Any, List


class IonDB:
    """
    Minimal, atomic DB layer for Ionirix credit accounting.
    Backed by SQLite by default, but can be swapped for Postgres/Dynamo.
    """

    def __init__(self, path: str = "ion.db"):
        self.path = path
        self.conn = sqlite3.connect(path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.lock = threading.Lock()
        self._init_schema()

    # ---------------------------------------------------------
    # SCHEMA
    # ---------------------------------------------------------
    def _init_schema(self):
        with self.conn:
            self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                balance REAL NOT NULL,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS reservations (
                job_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                amount REAL NOT NULL,
                timestamp REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS meter (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT NOT NULL,
                gpu_ms REAL NOT NULL,
                timestamp REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                reserved REAL NOT NULL,
                charged REAL NOT NULL,
                refund REAL NOT NULL,
                gpu_ms REAL NOT NULL,
                status TEXT DEFAULT 'charged',
                timestamp REAL NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON ledger(user_id);
            CREATE INDEX IF NOT EXISTS idx_ledger_job_id ON ledger(job_id);
            CREATE INDEX IF NOT EXISTS idx_meter_job_id ON meter(job_id);
            CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
            """)

    # ---------------------------------------------------------
    # USER BALANCE
    # ---------------------------------------------------------
    def get_balance(self, user_id: str) -> Decimal:
        """Get user's current credit balance."""
        row = self.conn.execute(
            "SELECT balance FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()

        if row is None:
            # Auto-create user with zero balance
            now = time.time()
            self.conn.execute(
                "INSERT INTO users (user_id, balance, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (user_id, 0.0, now, now)
            )
            self.conn.commit()
            return Decimal("0.0")

        return Decimal(str(row["balance"]))

    def update_balance(self, user_id: str, new_balance: Decimal):
        """Update user's balance."""
        with self.lock:
            self.conn.execute(
                "UPDATE users SET balance = ?, updated_at = ? WHERE user_id = ?",
                (float(new_balance), time.time(), user_id)
            )
            self.conn.commit()

    def add_balance(self, user_id: str, amount: Decimal):
        """Add credits to user's balance."""
        current = self.get_balance(user_id)
        self.update_balance(user_id, current + amount)

    # ---------------------------------------------------------
    # RESERVATIONS
    # ---------------------------------------------------------
    def create_reservation(self, job_id: str, user_id: str, amount: Decimal):
        """Create a credit reservation for a job."""
        with self.lock:
            self.conn.execute(
                "INSERT OR REPLACE INTO reservations (job_id, user_id, amount, timestamp) VALUES (?, ?, ?, ?)",
                (job_id, user_id, float(amount), time.time())
            )
            self.conn.commit()

    def get_reservation(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get reservation for a job."""
        row = self.conn.execute(
            "SELECT * FROM reservations WHERE job_id = ?", (job_id,)
        ).fetchone()

        if row is None:
            return None

        return {
            "job_id": row["job_id"],
            "user_id": row["user_id"],
            "amount": row["amount"]
        }

    def clear_reservation(self, job_id: str):
        """Clear reservation after job completes."""
        with self.lock:
            self.conn.execute(
                "DELETE FROM reservations WHERE job_id = ?", (job_id,)
            )
            self.conn.commit()

    # ---------------------------------------------------------
    # METERING
    # ---------------------------------------------------------
    def append_meter(self, job_id: str, gpu_ms: float):
        """Record GPU time for a job."""
        with self.lock:
            self.conn.execute(
                "INSERT INTO meter (job_id, gpu_ms, timestamp) VALUES (?, ?, ?)",
                (job_id, float(gpu_ms), time.time())
            )
            self.conn.commit()

    def sum_meter(self, job_id: str) -> float:
        """Sum total GPU time for a job."""
        row = self.conn.execute(
            "SELECT SUM(gpu_ms) AS total FROM meter WHERE job_id = ?",
            (job_id,)
        ).fetchone()

        return float(row["total"] or 0.0)

    def clear_meter(self, job_id: str):
        """Clear meter entries for a job."""
        with self.lock:
            self.conn.execute(
                "DELETE FROM meter WHERE job_id = ?", (job_id,)
            )
            self.conn.commit()

    # ---------------------------------------------------------
    # LEDGER
    # ---------------------------------------------------------
    def write_ledger_entry(
        self,
        job_id: str,
        user_id: str,
        reserved: float,
        charged: float,
        refund: float,
        gpu_ms: float,
        timestamp: float,
        status: str = "charged"
    ):
        """Write final ledger entry for a job."""
        with self.lock:
            self.conn.execute("""
                INSERT INTO ledger (job_id, user_id, reserved, charged, refund, gpu_ms, status, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (job_id, user_id, reserved, charged, refund, gpu_ms, status, timestamp))
            self.conn.commit()

    def get_ledger_entries(self, user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent ledger entries for a user."""
        rows = self.conn.execute("""
            SELECT * FROM ledger WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?
        """, (user_id, limit)).fetchall()

        return [
            {
                "job_id": row["job_id"],
                "user_id": row["user_id"],
                "reserved": row["reserved"],
                "charged": row["charged"],
                "refund": row["refund"],
                "gpu_ms": row["gpu_ms"],
                "status": row["status"],
                "timestamp": row["timestamp"]
            }
            for row in rows
        ]

    def get_ledger_by_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get ledger entry for a specific job."""
        row = self.conn.execute(
            "SELECT * FROM ledger WHERE job_id = ?", (job_id,)
        ).fetchone()

        if row is None:
            return None

        return {
            "job_id": row["job_id"],
            "user_id": row["user_id"],
            "reserved": row["reserved"],
            "charged": row["charged"],
            "refund": row["refund"],
            "gpu_ms": row["gpu_ms"],
            "status": row["status"],
            "timestamp": row["timestamp"]
        }

    def close(self):
        """Close database connection."""
        self.conn.close()
