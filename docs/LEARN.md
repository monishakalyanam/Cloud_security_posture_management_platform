# Learn the project: concepts, modules and one traced example

Read this before your review. Each section is short on purpose.

## 1. Concepts in plain words

| Word | Meaning | In this project |
| --- | --- | --- |
| **Frontend** | The part the user sees and clicks, running in the browser. | React app in `client/`. |
| **Backend** | A program on a server that holds the rules and talks to the database. The browser never talks to the database directly. | Express app in `server/`. |
| **Database** | Software that stores data permanently, even after the program stops. | MongoDB, with Mongoose to describe the data shape. |
| **API** | A set of addresses (URLs) a program can call to ask another program for data or actions. | Every URL starting with `/api`. |
| **REST** | A style of API design: URLs name things (`/scans/123`), and HTTP verbs say what to do: GET reads, POST creates, DELETE removes. | `GET /api/scans`, `POST /api/scans`, `DELETE /api/scans/:id`. |
| **JSON** | A text format for data using `{ "key": value }` and `[ ... ]`. | Cloud configurations, API requests and responses. |
| **Authentication** | Proving who you are. (Authorization is deciding what you may do.) | Login with email and password. |
| **JWT** (JSON Web Token) | A signed text token the server gives you after login. You send it with every request; the server checks the signature to know it is really you, without keeping a session in memory. | `Authorization: Bearer <token>` header, checked in `middleware/auth.js`. |
| **Hashing** | A one-way scramble of a password. You cannot reverse it, only compare. bcrypt is deliberately slow and adds random "salt", so attackers cannot guess quickly. | Only the hash is stored in MongoDB. |
| **Cloud resource** | Anything you rent from a cloud provider: a storage bucket, a firewall (security group), a user account, a database. | The five resource types in the JSON. |
| **Misconfiguration** | A setting that is legal but unsafe, such as a public bucket. Most cloud breaches come from these rather than from clever hacking. | What the rules look for. |
| **Rules engine** | Code that applies a list of small checks (rules) to data and reports which ones fail. | `server/src/rules-engine/`. |
| **Deployment** | Putting the app on the internet so others can use it, instead of only on your laptop. | Optional section of the README. |
| **CSPM** | Cloud Security Posture Management: tools that continuously check cloud settings against security best practice. | The category this project is a small student version of. |

## 2. The big picture

```
Browser (React)  --HTTP + JSON-->  Express API  --Mongoose-->  MongoDB
   pages, forms       /api/...      controllers                users, scans,
   sends JWT                        services                   resources, findings
                                    rules-engine (pure code)
```

A request always follows the same path: **route** (which URL) then **middleware** (are you logged in?) then **controller** (handle the request) then **service** (do the work) then **model** (save or read data) then **JSON response**. Errors at any step go to one central error handler.

## 3. Module by module

For each module: what it does, why it is needed, which files, how data flows, and how to show it in the review.

### Authentication (register, login, logout, protected pages)
- **What:** creates accounts, checks passwords, issues a JWT, and blocks pages and API calls without one.
- **Why:** each user must only see their own scans.
- **Files:** `server/src/controllers/authController.js`, `middleware/auth.js`, `models/User.js`; `client/src/AuthContext.jsx`, `App.jsx` (ProtectedRoute), `pages/Login.jsx`, `pages/Register.jsx`.
- **Flow:** form, then `POST /api/auth/register` (password checked, hashed with bcrypt, user saved), then token returned, then the browser stores it in `localStorage`, then `api.js` adds it to every request, then `requireAuth` verifies it and sets `req.user`. Logout simply deletes the token in the browser.
- **Demo:** register, log out, try to open `/scans` (you are sent to login), log in again. In MongoDB Compass open `users` and show that `passwordHash` is scrambled text.

### Validation
- **What:** checks that the uploaded JSON follows the schema and lists every problem with its location.
- **Why:** a missing field must never be silently treated as "secure", or the scan would give false comfort.
- **Files:** `server/src/rules-engine/validator.js`, `network.js` (CIDR checks); `client/src/pages/NewScan.jsx` (shows errors).
- **Flow:** JSON text, then the browser checks it is JSON at all, then the server runs `validateConfig`, which returns `{ valid, errors, resources }`. Bad file: HTTP 422 with the error list, nothing saved. Good file: a clean list of resources.
- **Demo:** click **Load invalid sample**, then **Check file**. You see seven precise errors such as `storageBuckets[0].encryptionEnabled is required`.

### Rules engine
- **What:** runs every applicable rule on every resource and returns findings plus counts and the score.
- **Why:** this is the core of the project, and it is separate from Express and MongoDB so it is easy to explain and to test.
- **Files:** `rules-engine/rules/*.js` (the 10 rules), `rules/index.js` (registry), `engine.js`, `score.js`, `constants.js`.
- **Flow:** for each resource and each rule with the same resource type, call `rule.evaluate(config)`, which returns `{ passed, evidence }`. Count the checks. Failed ones become findings, sorted by severity.
- **Demo:** run `npm test` in `server` and show the passing tests. Open `storageRules.js` and read STO-001 aloud: it is one small function.

### Scan service and persistence
- **What:** validates, evaluates, then saves one `Scan`, its `Resource` documents and its `Finding` documents.
- **Why:** results must be stored so the dashboard, history and reports use real data.
- **Files:** `services/scanService.js`, `models/Scan.js`, `Resource.js`, `Finding.js`.
- **Flow:** the scan is saved first with `status: running` and its summary numbers, then resources and findings are inserted, then the status becomes `completed`. If saving fails half-way, the partial data is deleted.
- **Demo:** run a scan, then show the `scans`, `resources` and `findings` collections in Compass.

### Ownership and access control
- **What:** every scan, finding, resource and report endpoint looks up data with both the record id **and** the logged-in user's id.
- **Why:** without this, anyone who guessed an id could read another person's data.
- **Files:** `controllers/scanController.js` (`getOwnedScan`, and `user:` in every query).
- **Flow:** user B asks for user A's scan, the query `{ _id, user: B }` finds nothing, and the API answers 404 (the same as a scan that does not exist, so it does not reveal that it exists).
- **Demo:** run `npm run test:api` and show the block "User B must not reach user A's data".

### Dashboard
- **What:** shows the latest scan's resource count, findings by severity, scan date, score, top findings and recent scans.
- **Why:** gives the overview at a glance.
- **Files:** `scanController.dashboard`, `client/src/pages/Dashboard.jsx`, `components/ScoreRing.jsx`.
- **Flow:** `GET /api/dashboard` returns the numbers stored in the scan summary. Nothing is hard-coded.
- **Demo:** scan the insecure sample (44%, 3 critical) then the secure sample (100%, no findings) and watch the dashboard change.

### Results, filters and finding details
- **Files:** `scanController.listFindings / listResources / getFinding`, `pages/ScanDetail.jsx`, `pages/FindingDetail.jsx`.
- **Flow:** the filter boxes send `?search=...&severity=...&type=...`; the server builds a MongoDB query (search text is escaped so it cannot inject a pattern).
- **Demo:** filter to Critical, search for `bucket`, open a finding and read evidence, explanation and suggested fix.

### Reports
- **What:** downloads a CSV (for spreadsheets) and a PDF (for reading) of all findings, highest severity first.
- **Files:** `services/reportCsv.js`, `services/reportPdf.js` (uses the `pdfkit` library), `scanController.downloadCsv / downloadPdf`, `client/src/api.js` (`download`).
- **Flow:** the browser fetches the file with the token, turns it into a downloadable blob and saves it. The CSV protects against "formula injection" by prefixing `'` to cells that start with `=`, `+`, `-` or `@`.
- **Demo:** download both from a scan page and open them.

## 4. One example traced end to end: a public bucket

Start with this entry in `server/sample-data/insecure.json`:

```json
{ "id": "bkt-public-assets", "name": "demo-public-assets", "publicAccess": true, "encryptionEnabled": false, "loggingEnabled": false }
```

1. **Load.** On **New scan** you click **Load insecure sample**. `NewScan.jsx` calls `GET /api/samples/insecure` and puts the text in the box.
2. **Run.** Clicking **Run scan** parses the text and calls `api.createScan`, which sends `POST /api/scans` with the JSON and your token.
3. **Guard.** `routes/index.js` sends the request through `requireAuth`, then to `scanController.createScan`, then to `scanService.runScan`.
4. **Validate.** `validateConfig` checks the three booleans and keeps a cleaned copy:
   `{ resourceId: "bkt-public-assets", type: "storage_bucket", name: "demo-public-assets", config: { name, publicAccess: true, encryptionEnabled: false, loggingEnabled: false } }`
5. **Evaluate.** `engine.js` sees a `storage_bucket`, so it runs STO-001, STO-002 and STO-003. STO-001 is this function:
   `bucket.publicAccess ? fail('publicAccess is true for bucket "..."') : pass('publicAccess is false')`
   It fails, so the engine creates this finding (STO-002 and STO-003 fail too):

   | Field | Value |
   | --- | --- |
   | ruleId | STO-001 |
   | title | Storage bucket allows public access |
   | severity | critical |
   | resourceId, resourceName | bkt-public-assets, demo-public-assets |
   | evidence | `publicAccess is true for bucket "demo-public-assets"` |
   | remediation | Turn on "block public access" for the bucket, remove public ACLs ... |

6. **Store.** `scanService` saves one `Scan` document (its summary says 13 resources, 25 checks, 11 passed, score 44, critical 3, high 7, medium 2, low 2), 13 `Resource` documents, and 14 `Finding` documents. The STO-001 finding links to the bucket's `Resource` document.
7. **Dashboard.** `GET /api/dashboard` returns that summary and the top five findings. The "Critical" bar shows 3, and STO-001 appears in the top findings table (third row, after DB-001 and IAM-001, because findings are sorted by severity, then rule ID).
8. **Details.** Clicking the finding calls `GET /api/scans/:id/findings/:findingId` and shows the evidence, why it matters and the suggested fix.
9. **Report.** The CSV contains this row (shortened here):
   `<scanId>,2026-09-30T...,critical,STO-001,Storage bucket allows public access,storage_bucket,bkt-public-assets,demo-public-assets,"publicAccess is true for bucket ""demo-public-assets""",Public buckets are a common cause of data leaks ...,"Turn on ""block public access"" ..."`
   The PDF lists the same finding as `1. [CRITICAL] STO-001 - Storage bucket allows public access` with the resource, evidence, why it matters and the suggested fix.

The engine output above is real: it was produced by running the engine on the sample file.
