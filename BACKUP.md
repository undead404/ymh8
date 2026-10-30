# ymh8 database backup and restore

Google Drive folder: [ymh8 backup](https://drive.google.com/drive/folders/1Set4vO1vts3_JjtJZgQ_g-ZnwiaRDLFc).

Database snapshot started on 2026-10-30 at 09:19:54 UTC (11:19:54 Kyiv).
Source: local PostgreSQL 14.23 database `ymh`, owned by role `ymh`.
The custom-format dump includes database schema, data, and database creation metadata.
It was fully read with `pg_restore --file=/dev/null` without errors; an actual restore has not been tested.

## Download and verify

The Drive upload limit requires four binary parts. Download all four
`ymh-2026-10-30T09-19-54Z.dump.part01` through `.part04` and `manifest.json`
from the folder into one directory. From that directory, reassemble in order:

```sh
cat ymh-2026-10-30T09-19-54Z.dump.part01 ymh-2026-10-30T09-19-54Z.dump.part02 ymh-2026-10-30T09-19-54Z.dump.part03 ymh-2026-10-30T09-19-54Z.dump.part04 > ymh-2026-10-30T09-19-54Z.dump
shasum -a 256 ymh-2026-10-30T09-19-54Z.dump
```

Expected size: **338068213 bytes**. Expected SHA-256:

```text
4a9eefef9581bc39f87428834a53ad26dbedba3f9a392929d01e0e51394aad16
```

The manifest also records each part's size and checksum. Verify the assembled
checksum before restoring. On Linux, `sha256sum` can replace `shasum -a 256`.

## Restore into a fresh PostgreSQL instance

Use PostgreSQL 14 tools or a compatible newer version. The dump does not include
cluster roles or role passwords. Create role `ymh` if it does not exist, and set
its password to match the application configuration. Replace `postgres` below
with your administrative PostgreSQL role if needed:

```sh
createuser -h localhost -U postgres --login --pwprompt ymh
pg_restore -h localhost -U postgres --dbname=postgres --create --exit-on-error ymh-2026-10-30T09-19-54Z.dump
```

These instructions expect the target database `ymh` to be absent. They do not
drop or overwrite an existing database. Check application data and run application
smoke checks before directing workers at the restored instance.

## Scope

This is a database backup, not a complete project backup. Git source/history,
ignored `.env` files and credentials, Redis/BullMQ state, and external service
configuration require separate preservation. Keep application credentials in a
secure location; they are not embedded in this guide.

The original unsplit dump is also stored locally under `backups/`.
