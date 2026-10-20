# Cloud Security Posture Management (CSPM) Platform

A solo college project. It checks **mock cloud configurations written as JSON** against a set of security rules,
stores the results in MongoDB, shows them on a dashboard and produces CSV and PDF remediation reports.

- Frontend: React + Vite + plain CSS
- Backend: Node.js + Express
- Database: MongoDB with Mongoose
- Login: JWT tokens and bcrypt password hashing (package `bcryptjs`, a pure-JavaScript bcrypt that installs without a C++ compiler on Windows)

> **Requirements source.** This project was built from the written requirements supplied in the request. No PPT file was
> attached in that conversation, so if your zeroth-review PPT lists anything not covered here, compare it with the feature
> table below.

## What is implemented and what is future work

| Area | Status in this version |
| --- | --- |
| Register, login, logout, protected pages | Implemented |
| Load sample JSON or upload your own JSON, with clear validation errors | Implemented |
| Manual scan, rules engine (10 rules), results stored in MongoDB | Implemented |
| Dashboard, resource and finding tables with search and filters, finding details | Implemented |
| Scan history, reopen old results, CSV and PDF remediation reports | Implemented |
| Each user sees only their own scans, findings and reports | Implemented |
| **AWS SDK / live cloud scanning** | **Future extension.** Not implemented. No AWS account or credentials are needed or used. |
| **Scheduled scanning** | **Future enhancement.** Not implemented. Scans start only when you press "Run scan". |
| **Natural-language querying** | **Future enhancement.** Not implemented. |
| Automatic fixing of real cloud resources | Deliberately not included. The tool only suggests fixes. |

## The workflow

Log in, then load a sample or upload JSON, then run a scan. The backend validates the JSON, the rules engine evaluates every
resource, MongoDB stores the scan, resources and findings, the dashboard displays them, and you download a report.

## Folder structure

```
cspm-platform/
  README.md
  docs/
    LEARN.md          concepts, module explanations, one fully traced example
    SCHEMA.md         mock JSON schema, rule list, severity policy, score definition
    REVIEW.md         architecture, collections, API table, checklist, scripts, viva Q&A
  server/             the backend (Express API)
    .env.example
    sample-data/      secure.json, insecure.json, invalid.json
    src/
      index.js, app.js
      config/         env.js (reads .env), db.js (connects to MongoDB)
      models/         User, Scan, Resource, Finding
      middleware/     auth.js (JWT check), errorHandler.js
      controllers/    authController, scanController, sampleController
      routes/         index.js (URL -> controller)
      services/       scanService (validate, evaluate, save), reportCsv, reportPdf
      rules-engine/   pure JavaScript, no database, no libraries
        validator.js, engine.js, score.js, network.js, constants.js
        rules/        storageRules, networkRules, iamRules, databaseRules, index
    tests/            rules.test.js, validator.test.js, score.test.js, csv.test.js, api.integration.js
  client/             the frontend (React)
    src/
      api.js, AuthContext.jsx, hooks.js, App.jsx, main.jsx, styles.css
      components/     Layout, Feedback (Loading/Empty/Error), SeverityBadge, ScoreRing
      pages/          Login, Register, Dashboard, NewScan, ScanDetail, FindingDetail, History, NotFound
```

## Setup on Windows with VS Code

### 1. Install the software (once)

| Software | Where | Check it worked (in any terminal) |
| --- | --- | --- |
| Node.js **LTS** (20 or newer) | https://nodejs.org | `node -v` and `npm -v` |
| Visual Studio Code | https://code.visualstudio.com | |
| MongoDB Community Server (choose "Install as a Service") | https://www.mongodb.com/try/download/community | `mongod --version` |
| MongoDB Compass (optional, to look inside the database) | offered by the MongoDB installer | |
| Git (optional) | https://git-scm.com | `git --version` |

After installing, **close and reopen VS Code** so it can find the new programs.

### 2. Open the project

VS Code, then **File > Open Folder...**, choose the `cspm-platform` folder. Open a terminal with **Terminal > New Terminal**.
You will use **two terminals**: one for the backend and one for the frontend. Use the `+` button in the terminal panel to add the second.

### 3. Make sure MongoDB is running

The Windows installer starts MongoDB automatically as a service. To check, open PowerShell and run:

```
Get-Service MongoDB
```

`Status` should say `Running`. If it says `Stopped`, open PowerShell **as Administrator** and run `net start MongoDB`.

**Alternative: MongoDB Atlas (cloud, free tier).** Create a free cluster at https://www.mongodb.com/atlas, add a database user,
allow your IP address under Network Access, choose "Drivers" to copy the connection string, and use it as `MONGODB_URI` in the
next step. Put the database name `cspm` before the `?`, for example `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/cspm?retryWrites=true&w=majority`.
If the password contains symbols such as `@` or `#`, URL-encode them.

### 4. Backend: Terminal 1, inside the `server` folder

```
cd server
npm install
copy .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The last command prints a long random string. Open `server/.env` in VS Code and replace the text after `JWT_SECRET=` with it.
Leave the other lines as they are for local MongoDB. Then run the unit tests and start the API:

```
npm test
npm run dev
```

You should see `MongoDB connected` and `API running at http://localhost:5000/api/health`. Leave this terminal open.

### 5. Frontend: Terminal 2, inside the `client` folder

```
cd client
npm install
npm run dev
```

Open **http://localhost:5173** in your browser. Register an account, then go to **New scan**, click **Load insecure sample**,
then **Run scan**.

### 6. Run the automated API checks (optional but recommended)

With the backend running in Terminal 1, open a **third** terminal:

```
cd server
npm run test:api
```

It registers two test users, runs scans, downloads reports and confirms that user B cannot reach user A's data.
Every line should say `PASS`.

## Common problems and fixes

| Symptom | Fix |
| --- | --- |
| `npm` is not recognized | Node.js is not installed or VS Code was not restarted. Install Node LTS, then reopen VS Code. |
| PowerShell says "running scripts is disabled" | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or switch the terminal to Command Prompt. |
| `Missing JWT_SECRET` or `Missing MONGODB_URI` | `.env` must be inside the `server` folder and named exactly `.env` (not `.env.txt`). |
| `JWT_SECRET must be a long random value` | Replace the placeholder with the output of the `node -e ...` command from step 4. |
| `Could not connect to MongoDB` / `ECONNREFUSED 127.0.0.1:27017` | MongoDB is not running. See step 3. For Atlas, check the connection string, the password encoding and Network Access. |
| Browser shows "Cannot reach the server" | The backend is not running, or it uses a port other than 5000. If you change `PORT`, also change the proxy address in `client/vite.config.js`. |
| `EADDRINUSE: address already in use :::5000` | Another program uses port 5000. Set `PORT=5001` in `.env` and update `client/vite.config.js`. |
| `npm install` fails or hangs | Check the internet connection (college networks can block npm). Delete the `node_modules` folder and `package-lock.json`, then try again. |
| You are logged out after restarting | Expected if you changed `JWT_SECRET`; log in again. |

## Optional deployment (do this only after everything works locally)

The pieces are: a database (MongoDB Atlas), the backend (any Node host such as Render or Railway), and the frontend (a static host such as Netlify or Vercel).

1. **Database.** Create an Atlas cluster and database user. Under Network Access allow the backend host (for a student demo, `0.0.0.0/0` is the simplest, with a strong database password).
2. **Backend host.** Root directory `server`, build command `npm install`, start command `npm start`. Set the environment variables `MONGODB_URI` (Atlas string), `JWT_SECRET` (a new random value), `NODE_ENV=production` and `CLIENT_ORIGIN` (the exact frontend address, for example `https://your-app.netlify.app`, without a trailing slash).
3. **Frontend host.** Root directory `client`, build command `npm run build`, publish directory `dist`. Set `VITE_API_URL` to `https://YOUR-BACKEND-HOST/api`. Vite bakes this value in at build time, so rebuild after changing it. The file `client/public/_redirects` makes page refreshes work on Netlify; on Vercel add a rewrite of all paths to `/index.html`.
4. **CORS.** Browsers only allow the frontend to call the backend if the backend lists the frontend's address. That is what `CLIENT_ORIGIN` does. A CORS error in the browser console almost always means this value is wrong.
5. Check `https://YOUR-BACKEND-HOST/api/health` in the browser, then register and run a scan from the deployed frontend.

Deployment has **not** been attempted for this project, so nothing here is claimed to be deployed.

## Limitations

- Mock JSON input only; no live cloud access.
- Ten rules. Severity is a fixed rating per rule, not a computed exploitability score.
- The score is a project security-check score, not a CIS or NIST compliance result.
- Login tokens are kept in browser `localStorage` and last one day; there is no server-side logout list, refresh token, email verification, password reset or login rate limiting.
- Scans are limited to 500 resources and 1 MB of JSON. Lists are not paginated.
- The `0.0.0.0/0` and `::/0` checks flag rules open to the *entire* internet. A very wide but partial range such as `0.0.0.0/1` is not flagged.
