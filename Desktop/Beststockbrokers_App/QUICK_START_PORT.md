# Quick Start - Port 3001

## Start Development Server on Port 3001

To start the development server on port 3001, run:

```bash
npx next dev -p 3001
```

Or use the PowerShell script:

```powershell
.\start-dev.ps1
```

The server will be available at: **http://localhost:3001**

---

## Before Running

Make sure you have:

1. **Installed dependencies:**
   ```bash
   npm install
   ```

2. **Set up your environment variables** (copy from `env.example.txt`)

3. **Set up the database:**
   ```bash
   # Push schema to database
   npx prisma db push
   
   # Generate Prisma client
   npx prisma generate
   ```

4. **Then start the server:**
   ```bash
   npx next dev -p 3001
   ```

---

## Access the Application

- **Main site:** http://localhost:3001
- **Admin panel:** http://localhost:3001/admin
- **API:** http://localhost:3001/api
