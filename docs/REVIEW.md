# Review preparation

## 1. Architecture

```
+-----------------------+   HTTP + JSON (JWT in header)   +----------------------------------------+
|  Browser              | ------------------------------> |  Express API (server/)                 |
|  React + Vite (client)|                                 |   routes -> auth middleware            |
|  pages, forms, tables |  <------------------------------|   -> controllers -> services           |
+-----------------------+   { success, data | error }     |        |                  |            |
                                                          |        v                  v            |
                                                          |  rules-engine        Mongoose models   |
                                                          |  (validator, rules,        |           |
                                                          |   engine, score)           v           |
                                                          +----------------------------|-----------+
                                                                                       v
                                                                          +------------------------+
                                                                          | MongoDB                |
                                                                          | users, scans,          |
                                                                          | resources, findings    |
                                                                          +------------------------+
```

## 2. Database collections and relationships

| Collection | Important fields | Relationship |
| --- | --- | --- |
| `users` | name, email (unique), passwordHash | One user has many scans |
| `scans` | user, sourceName, sourceType, status, createdAt, summary (totals, findingsBySeverity, score) | Belongs to one user. Has many resources and findings. |
| `resources` | scan, user, resourceId, type, name, config | Belongs to one scan |
| `findings` | scan, user, resource, ruleId, title, severity, severityRank, evidence, whyItMatters, remediation, resourceId, resourceType, resourceName | Belongs to one scan and points to one resource |

`users` 1 to many `scans`; `scans` 1 to many `resources`; `scans` 1 to many `findings`; `resources` 1 to many `findings`.
`resources` and `findings` also store `user`, so every query can filter by owner directly.

## 3. API endpoints

All responses look like `{ "success": true, "data": ... }` or `{ "success": false, "error": { "message", "details" } }`.
Everything except register and login needs `Authorization: Bearer <token>`.

| Method and path | Purpose |
| --- | --- |
| `POST /api/auth/register` | Create account, returns token and user |
| `POST /api/auth/login` | Log in, returns token and user |
| `GET /api/auth/me` | Current user |
| `GET /api/samples` and `GET /api/samples/:id` | List, and fetch, the secure, insecure and invalid sample files |
| `GET /api/rules` | The rule catalogue (no code, only descriptions) |
| `GET /api/dashboard` | Latest scan, top findings, recent scans, scan count |
| `POST /api/scans/validate` | Check a JSON file without saving |
| `POST /api/scans` | Validate, evaluate and save a scan (body: `config`, `sourceName`, `sourceType`) |
| `GET /api/scans` | Scan history for the current user |
| `GET /api/scans/:scanId` | One scan with its summary |
| `DELETE /api/scans/:scanId` | Delete a scan with its resources and findings |
| `GET /api/scans/:scanId/findings` | Findings; filters `search`, `severity`, `type` |
| `GET /api/scans/:scanId/findings/:findingId` | One finding in full |
| `GET /api/scans/:scanId/resources` | Resources with failed-check counts; filters `search`, `type` |
| `GET /api/scans/:scanId/report.csv` and `report.pdf` | Remediation reports |
| `GET /api/health` | Server check (no login needed) |

Status codes used: 200, 201, 400 (bad input), 401 (not logged in), 404 (not found, or not yours), 409 (email exists), 413 (body over 1 MB), 422 (JSON file failed validation), 500.

## 4. Feature checklist

"Verified" means a check that was actually executed. The build environment had no npm registry access and no MongoDB, so only the rules-engine tests and file-parsing checks could be run there. Run the rest yourself with the steps in the README.

| Feature | Code written | Verified how |
| --- | --- | --- |
| Rules engine, 10 rules, IPv4 and IPv6 | Yes | **Executed:** `npm test` (28 tests passed in the build environment) |
| JSON validation and error paths | Yes | **Executed:** unit tests, including the invalid sample |
| Score calculation and N/A | Yes | **Executed:** unit tests |
| Severity ordering | Yes | **Executed:** unit test on the insecure sample (3 critical, 7 high, 2 medium, 2 low) |
| CSV building and formula protection | Yes | **Executed:** unit tests (the download endpoint itself is not yet run) |
| Register, login, logout, protected routes | Yes | Not yet run. Automated check written in `tests/api.integration.js`; do the manual login demo too |
| Scan persistence in MongoDB | Yes | Not yet run. Covered by `npm run test:api` |
| Ownership checks on all scan endpoints | Yes | Not yet run. `npm run test:api` tries seven cross-user requests |
| Dashboard values from stored scans | Yes | Not yet run. `npm run test:api` compares them with the expected 44% / 100% |
| CSV and PDF downloads | Yes | Not yet run. `npm run test:api` checks status, type and `%PDF` header. Open a PDF yourself too |
| React pages, filters, empty and loading states | Yes | JSX files parse without errors; **not yet viewed in a browser** |
| Local setup (`npm install`, servers start) | Yes | Not yet run |
| Optional deployment | Instructions only | Not attempted |
| AWS SDK, scheduled scans, natural-language queries | No | Future work |

Completion is best described by working features, not a percentage: all eight steps of the core workflow are implemented in code, the
rules engine is verified by executed tests, and the database, API and browser layers are verified once you run the steps above.

## 5. Five-minute presentation script

> Good morning. My project is a **Cloud Security Posture Management Platform**. It finds risky settings in cloud environments before an attacker does.
>
> **The problem.** Many cloud breaches are not clever hacks. They happen because of misconfigurations: a storage bucket left public, a database open to the internet, an administrator account without multi-factor authentication. Checking these by hand across many resources is slow and error-prone.
>
> **My solution.** I built a full-stack web application. The frontend is React, the backend is Node and Express, the data is stored in MongoDB, and users log in with JWT tokens and bcrypt-hashed passwords. In this phase my project evaluates *mock* cloud configurations that I supply as JSON, so it needs no cloud account. Connecting to real AWS accounts is a planned future extension, and so are scheduled scans and natural-language queries.
>
> **How it works.** I log in, load a sample or upload a JSON file, and press Run scan. My backend first validates the file. If a required field is missing, it reports the exact location instead of guessing that the setting is safe. Then my rules engine runs ten checks: public buckets, missing encryption and logging, SSH and RDP open to the internet on both IPv4 and IPv6, wildcard IAM policies, administrators without MFA, and public, unencrypted or unbacked-up databases. Every rule has an ID, a severity, evidence and remediation advice. The results are saved in MongoDB.
>
> **The dashboard.** It shows the number of resources, findings by severity, the scan date and a security-check score. My score is passed checks divided by applicable checks, times one hundred. I am careful to call it a project score, not a CIS or NIST certification. Everything on screen comes from stored scan results.
>
> **Details and reports.** I can search and filter findings, open one to see the affected resource, the evidence, why it matters and a suggested fix, look at my scan history, and download CSV and PDF remediation reports.
>
> **Security.** Passwords are hashed, secrets live in an environment file, uploads are limited to one megabyte, and every query is filtered by the logged-in user, so one user cannot open another user's scans.
>
> **Testing.** I tested the rules engine, validation, scoring and CSV generation with automated tests, and I wrote an API test that also checks the access control.
>
> **Limitations and future work.** It uses mock data, has ten rules, and severity is a fixed rating, not a measure of exploitability. Next I would add live AWS scanning, scheduled scans, more rules and natural-language queries. Thank you.

## 6. Step-by-step demonstration script

1. Show MongoDB running and both terminals: backend on port 5000, frontend on 5173.
2. Open http://localhost:5173. You are sent to the login page (protected route). Register a new account.
3. The dashboard shows the empty state. Click **Start a scan**.
4. Click **Load invalid sample**, then **Check file**. Point at the precise error list (missing field, wrong type, bad port, bad CIDR, duplicate id, mistyped section).
5. Click **Load insecure sample**, **Check file** (valid, 13 resources), then **Run scan**.
6. On the results page point at: 44% score, 11 of 25 checks, 14 findings, severity chips (3 / 7 / 2 / 2).
7. Filter severity to **Critical**; search `bucket`; **Clear filters**. Switch to **Resources** and open a configuration.
8. Open the STO-001 finding: resource, evidence, rule, why it matters, suggested fix.
9. Download the **CSV** and **PDF** reports and open them.
10. Go to **New scan**, load the **secure sample**, run it: 100% and no findings. Go to the **Dashboard** and show it changed.
11. Open **Scan history**: two scans; open the older one again.
12. Show MongoDB Compass: `users` (hashed password), `scans`, `resources`, `findings`.
13. Show the code: `storageRules.js` (STO-001), `engine.js`, then run `npm test` and `npm run test:api`.
14. Optional: register a second account and show its dashboard is empty (data isolation). Then **Log out**.

## 7. Twenty likely viva questions

1. **What does your project do?** It evaluates mock cloud configurations against security rules, stores the findings, shows them on a dashboard and produces remediation reports.
2. **Why did you use mock JSON instead of real AWS?** It needs no account, credentials or cost, and it is safe and repeatable. Live AWS scanning through the AWS SDK is a planned extension.
3. **What is a misconfiguration?** A setting that is allowed but unsafe, such as a public storage bucket.
4. **What is a CSPM tool?** A tool that continuously checks cloud settings against security best practice and reports risks.
5. **Explain your architecture.** React frontend calls a REST API in Express, which uses a separate rules engine and Mongoose models to store data in MongoDB.
6. **Why is the rules engine separate?** It contains no Express or database code, so it is easy to explain, test and extend.
7. **How do you add a new rule?** Add a rule object (ID, type, severity, description, remediation, evaluate function) in the rules folder, register it in `rules/index.js`, and add a test.
8. **How is the score calculated?** Passed applicable checks divided by total evaluated applicable checks, times 100. It shows N/A when nothing was applicable. It is not a CIS or NIST score.
9. **What does "applicable" mean?** A rule counts only for resources it applies to. For example the MFA rule applies only to users who can sign in to the console.
10. **How do you rank severity?** Each rule has a fixed severity by impact category (see `docs/SCHEMA.md`). It is not a measure of exploitability.
11. **How do you handle missing fields?** Validation reports them as errors with their location. Nothing unknown is assumed to be secure.
12. **How do you detect internet exposure?** A rule is open if its CIDR prefix is /0, that is `0.0.0.0/0` for IPv4 or `::/0` for IPv6. Both lists are checked.
13. **What is a JWT and how do you use it?** A signed token given at login. The browser sends it in the Authorization header, and middleware verifies the signature and finds the user.
14. **How are passwords stored?** As bcrypt hashes with salt. The password itself is never stored or returned.
15. **How does logout work?** The token is stateless, so logout deletes it from the browser. It expires by itself after a day. A server-side blocklist is future work.
16. **How do you stop one user reading another's scans?** Every query includes the logged-in user's id along with the record id. Another user's scan returns 404.
17. **Why MongoDB?** It was chosen because it is in my course, and scan results are document-shaped. Mongoose gives them a schema.
18. **What is REST?** An API style where URLs name resources and HTTP methods (GET, POST, DELETE) express the action.
19. **How do you protect the API?** JWT check on all data routes, a 1 MB body limit, input validation, the helmet security headers, CORS limited to the frontend address, centralised error handling that hides internals.
20. **What are the limitations, and how does this relate to real tools?** It has ten rules, mock input, no scheduling and no compliance mapping. Real CSPM products such as commercial platforms and open-source scanners like Prowler and ScoutSuite read live cloud APIs and have hundreds of checks. My project is a learning prototype of the same idea, not a replacement.

## 8. Honest limitations and future enhancements

**Limitations:** mock JSON only; 10 rules; fixed severity; score is not a compliance result; tokens in `localStorage`; no refresh tokens, password reset, email verification or rate limiting; no pagination; only fully open (/0) ranges are flagged; the API integration test and the browser UI have not been executed by the author of this code, only by you.

**Future work (not implemented):** live AWS scanning with the AWS SDK using read-only credentials, scheduled scans, natural-language queries, more rules and providers, mapping rules to published benchmarks, comparing two scans, role-based access, and deployment hardening.

## 9. How this relates to existing CSPM tools

Existing CSPM products and open-source scanners (for example Prowler and ScoutSuite) connect to live cloud accounts, run hundreds of checks, map results to published benchmarks and monitor continuously. This project applies the same basic idea in a small, local form: describe resources, evaluate rules, rank findings, report fixes. Its value is as a learning prototype whose every line I can explain. I do not claim it is novel, and I have not repeated any statistics from the zeroth-review PPT because I could not verify them.
