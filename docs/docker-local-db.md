# Docker Local Database

## Connection Reference

- Container: `postgres`
- Database: `carbooking`
- Host: `localhost`
- Port: `5433`
- User: `admin`
- Password: `112233`
- DB Type: `postgres`

## Connect from Host via psql

```powershell
psql -h localhost -p 5433 -U admin -d carbooking
```

## Connect inside Docker Container

```powershell
docker exec -it postgres psql -U admin -d carbooking
```

## Run a SQL file from Host into Container

```powershell
Get-Content .\init-postgres.sql | docker exec -i postgres psql -U admin -d carbooking
```

## Run a single SQL command in Container

```powershell
docker exec -i postgres psql -U admin -d carbooking -c "SELECT current_database(), current_user;"
```

## Verify tables

```powershell
docker exec -i postgres psql -U admin -d carbooking -c "\dt"
```

## Verify driver_type data

```powershell
docker exec -i postgres psql -U admin -d carbooking -c "SELECT id, code, driver_type FROM driver_type ORDER BY code;"
```
