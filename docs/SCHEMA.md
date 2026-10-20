# Mock JSON schema, rules, severity policy and score

## File format

One JSON object. Every section is optional, but at least one resource must exist. Unknown section names are **rejected** (a typo such as
`"databses"` would otherwise silently skip your databases and make the file look secure). Extra fields inside a resource are ignored and not stored.

Every resource needs `id`: a unique, non-empty text value (unique across the whole file).

```json
{
  "metadata": { "name": "optional label" },
  "storageBuckets": [
    { "id": "bkt-1", "name": "my-bucket", "publicAccess": false, "encryptionEnabled": true, "loggingEnabled": true }
  ],
  "securityGroups": [
    {
      "id": "sg-1", "name": "web",
      "inboundRules": [
        { "protocol": "tcp", "fromPort": 22, "toPort": 22, "ipv4Cidrs": ["10.0.0.0/8"], "ipv6Cidrs": [] }
      ]
    }
  ],
  "iamUsers": [
    { "id": "usr-1", "userName": "alice", "consoleAccess": true, "mfaEnabled": true }
  ],
  "iamPolicies": [
    { "id": "pol-1", "name": "ReadOnly",
      "statements": [ { "effect": "Allow", "actions": ["s3:GetObject"], "resources": ["arn:aws:s3:::my-bucket/*"] } ] }
  ],
  "databases": [
    { "id": "db-1", "name": "orders", "engine": "postgres", "publiclyAccessible": false, "encryptionEnabled": true, "backupEnabled": true }
  ]
}
```

### Field rules

| Section | Required fields and types |
| --- | --- |
| `storageBuckets` | `id`, `name` (text); `publicAccess`, `encryptionEnabled`, `loggingEnabled` (true or false) |
| `securityGroups` | `id`, `name` (text); `inboundRules` (array, may be empty) |
| ... each inbound rule | `protocol`: `tcp`, `udp`, `icmp`, `icmpv6`, `-1` or `all` (both mean every protocol and port). `fromPort` and `toPort`: whole numbers 0 to 65535, required for `tcp` and `udp`, and `fromPort` must not exceed `toPort`. `ipv4Cidrs` and/or `ipv6Cidrs`: arrays of valid CIDR strings (an empty array is allowed, but at least one of the two keys must be present). |
| `iamUsers` | `id`, `userName` (text); `consoleAccess` (true or false); `mfaEnabled` (true or false, **required only when `consoleAccess` is true**) |
| `iamPolicies` | `id`, `name` (text); `statements` (non-empty array). Each statement: `effect` (`"Allow"` or `"Deny"`), `actions` and `resources` (a text value or a non-empty array of text values) |
| `databases` | `id`, `name`, `engine` (text); `publiclyAccessible`, `encryptionEnabled`, `backupEnabled` (true or false) |

Booleans must be real `true` or `false`. The text `"true"`, `"yes"` and the numbers `1` and `0` are rejected. A missing required field is an error; it is never treated as secure.
Limit: 500 resources per file and 1 MB of JSON. Validation errors are returned as a list of `{ path, message }`, for example `storageBuckets[0].encryptionEnabled is required (must be true or false)`.

### Internet exposure (IPv4 and IPv6)

An address range counts as "open to the internet" when its prefix length is `/0`: `0.0.0.0/0` (IPv4) or `::/0` (IPv6). A rule is checked in both `ipv4Cidrs` and `ipv6Cidrs`, so a group that is closed on IPv4 but open on IPv6 is still caught. A rule with protocol `-1` covers every port.

## Rules

Each rule has an `id`, `title`, `appliesTo` (resource type), `severity`, `description`, `whyItMatters`, `remediation` and an `evaluate()` function. IAM-002 also has `isApplicable()`.

| ID | Applies to | Check | Severity |
| --- | --- | --- | --- |
| STO-001 | Storage bucket | Public access enabled | Critical |
| STO-002 | Storage bucket | Encryption disabled | High |
| STO-003 | Storage bucket | Access logging disabled | Low |
| NET-001 | Security group | SSH (TCP 22) open to `0.0.0.0/0` or `::/0` | High |
| NET-002 | Security group | RDP (TCP 3389) open to `0.0.0.0/0` or `::/0` | High |
| IAM-001 | IAM policy | An Allow statement with actions `*` on resources `*` (partial wildcards like `s3:*` are not flagged) | Critical |
| IAM-002 | IAM user | Console access enabled without MFA (users without console access are not applicable) | High |
| DB-001 | Database | Publicly accessible | Critical |
| DB-002 | Database | Encryption disabled | High |
| DB-003 | Database | Automated backups disabled | Medium |

To add a rule, write a rule object in a file under `server/src/rules-engine/rules/`, add it to the list in `rules/index.js`, and add a test. Nothing else changes.

## Severity policy

Severity is a **fixed rating per rule**, chosen by the category of impact. It is not a calculated exploitability or risk score, and the tool does not claim to measure real-world exploitability.

| Level | Meaning | Rules |
| --- | --- | --- |
| Critical | Exposes a data store to the public internet, or grants unrestricted permissions | STO-001, DB-001, IAM-001 |
| High | Exposes a remote-administration port to the internet, or a key protective control is missing (encryption at rest, MFA) | NET-001, NET-002, STO-002, DB-002, IAM-002 |
| Medium | Weakens recovery or resilience | DB-003 |
| Low | Weakens visibility and auditing | STO-003 |

Findings are ranked by severity (Critical first), then by rule ID, then by resource ID.

## Security-check score

```
score = passed applicable checks / total evaluated applicable checks x 100
```

- A *check* is one rule evaluated against one resource. A check is *applicable* when the rule applies to that resource type (and its `isApplicable()` returns true).
- The score is rounded to one decimal place. If there are **no applicable checks** the dashboard shows **N/A**, not 0% and not 100%.
- Example (insecure sample): 25 applicable checks, 11 passed, so 11 / 25 = **44%**.
- This is a project security-check score. It is **not** proof of CIS, NIST or any other certification, and it does not map to their controls.
