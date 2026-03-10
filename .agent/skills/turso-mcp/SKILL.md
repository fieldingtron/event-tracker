---
name: turso-mcp
description: How to use the Turso Database MCP server for database operations (queries, schema changes, data manipulation)
---

# Turso Database MCP Server

The Turso MCP server lets AI assistants interact with SQLite/Turso databases directly through MCP tools — no raw SQL or curl needed.

## Setup

### Install Turso CLI
```bash
curl -sSL tur.so/install | sh
```

### Add MCP Server (Claude Code)
```bash
# Local project database
claude mcp add my-database -- tursodb ./path/to/database.db --mcp

# With absolute path
claude mcp add my-database -- tursodb /absolute/path/to/database.db --mcp

# Project-scoped (local only)
claude mcp add my-database --local -- tursodb ./database.db --mcp
```

### Add MCP Server (Claude Desktop)
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "turso": {
      "command": "tursodb",
      "args": ["path/to/your/database.db", "--mcp"]
    }
  }
}
```

### Manage MCP Servers
```bash
claude mcp list              # List all configured servers
claude mcp get my-database   # Get details about a server
claude mcp remove my-database # Remove a server
```

## Available MCP Tools

The Turso MCP server provides **9 tools**:

| Tool | Description |
|------|-------------|
| `open_database` | Open a new database |
| `current_database` | Describe the current database |
| `list_tables` | List all tables in the database |
| `describe_table` | Get the structure of a specific table |
| `execute_query` | Execute read-only SELECT queries |
| `insert_data` | Insert new data into tables |
| `update_data` | Update existing data in tables |
| `delete_data` | Delete data from tables |
| `schema_change` | Execute schema modifications (CREATE TABLE, ALTER TABLE, DROP TABLE) |

## Usage Patterns

### When to Use
- Creating or modifying database tables (use `schema_change`)
- Querying data to debug or verify (use `execute_query`)
- Inserting test/seed data (use `insert_data`)
- Checking current schema (use `list_tables` + `describe_table`)
- Running migrations that drizzle-kit can't execute (permissions issues, etc.)

### Fallback: Turso HTTP API
If the MCP server is not connected, you can use the Turso HTTP API directly:
```bash
curl -s -X POST "https://<database-hostname>" \
  -H "Authorization: Bearer <TURSO_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"statements": ["YOUR SQL HERE"]}'
```

The database hostname and auth token are in `.env.local` as `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.

## Project-Specific Notes

For the **event-tracker** project:
- Database: `libsql://event-tracker-db-gonker.aws-us-east-1.turso.io`
- Schema is defined in `lib/db/schema.ts` (Drizzle ORM, SQLite dialect)
- Tables: `user`, `session`, `account`, `verification`, `settings`, `projects`, `project_api_keys`, `events`
- Migrations are in `./drizzle/` and managed with `drizzle-kit`
