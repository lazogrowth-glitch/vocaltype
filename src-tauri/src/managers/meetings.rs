use anyhow::Result;
use log::{debug, info};
use rusqlite::{params, Connection};
use rusqlite_migration::{Migrations, M};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

static MIGRATIONS: &[M] = &[M::up(
    "CREATE TABLE IF NOT EXISTS meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT '',
        app_name TEXT NOT NULL DEFAULT '',
        transcript TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    );",
)];

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct MeetingEntry {
    pub id: i64,
    pub title: String,
    pub app_name: String,
    pub transcript: String,
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct MeetingManager {
    db_path: PathBuf,
}

impl MeetingManager {
    pub fn new(app_handle: &AppHandle) -> Result<Self> {
        let app_data_dir = app_handle.path().app_data_dir()?;
        let db_path = app_data_dir.join("meetings.db");

        let manager = Self { db_path };
        manager.init_database()?;
        Ok(manager)
    }

    fn init_database(&self) -> Result<()> {
        info!("Initializing meetings database at {:?}", self.db_path);
        let mut conn = Connection::open(&self.db_path)?;
        let migrations = Migrations::new(MIGRATIONS.to_vec());

        #[cfg(debug_assertions)]
        migrations.validate().expect("Invalid meetings migrations");

        migrations.to_latest(&mut conn)?;
        debug!("Meetings database initialized");
        Ok(())
    }

    fn open(&self) -> Result<Connection> {
        Ok(Connection::open(&self.db_path)?)
    }

    pub fn get_meetings(&self) -> Result<Vec<MeetingEntry>> {
        let conn = self.open()?;
        let mut stmt = conn.prepare(
            "SELECT id, title, app_name, transcript, created_at, updated_at FROM meetings ORDER BY updated_at DESC",
        )?;
        let entries = stmt
            .query_map([], |row| {
                Ok(MeetingEntry {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    app_name: row.get(2)?,
                    transcript: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(entries)
    }

    pub fn create_meeting(&self, title: &str, app_name: &str) -> Result<MeetingEntry> {
        let conn = self.open()?;
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "INSERT INTO meetings (title, app_name, transcript, created_at, updated_at) VALUES (?1, ?2, '', ?3, ?4)",
            params![title, app_name, now, now],
        )?;
        let id = conn.last_insert_rowid();
        Ok(MeetingEntry {
            id,
            title: title.to_string(),
            app_name: app_name.to_string(),
            transcript: String::new(),
            created_at: now,
            updated_at: now,
        })
    }

    pub fn append_segment(&self, id: i64, segment: &str) -> Result<()> {
        let conn = self.open()?;
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "UPDATE meetings SET transcript = transcript || ?1, updated_at = ?2 WHERE id = ?3",
            params![segment, now, id],
        )?;
        Ok(())
    }

    pub fn update_meeting(&self, id: i64, title: &str, transcript: &str) -> Result<()> {
        let conn = self.open()?;
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "UPDATE meetings SET title = ?1, transcript = ?2, updated_at = ?3 WHERE id = ?4",
            params![title, transcript, now, id],
        )?;
        Ok(())
    }

    pub fn delete_meeting(&self, id: i64) -> Result<()> {
        let conn = self.open()?;
        conn.execute("DELETE FROM meetings WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn search_meetings(&self, query: &str) -> Result<Vec<MeetingEntry>> {
        let conn = self.open()?;
        let pattern = format!("%{}%", query);
        let mut stmt = conn.prepare(
            "SELECT id, title, app_name, transcript, created_at, updated_at FROM meetings
             WHERE title LIKE ?1 OR transcript LIKE ?1
             ORDER BY updated_at DESC",
        )?;
        let entries = stmt
            .query_map(params![pattern], |row| {
                Ok(MeetingEntry {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    app_name: row.get(2)?,
                    transcript: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(entries)
    }
}
