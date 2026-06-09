This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database Setup (Docker)

You can set up the database using the existing `mariadb10` container:

### Using Docker Command
Run the following command in your terminal to import the schema:

```bash
docker exec -i mariadb10 mysql -u root -p112233 < init-db.sql
```

## Environment Variables
The application is pre-configured to connect to the database with these defaults:
- Host: `127.0.0.1`
- Port: `3306`
- User: `root`
- Password: `112233`
- Database: `carbooking`
