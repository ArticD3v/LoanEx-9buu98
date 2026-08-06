## Bank Account Verification

### APIs

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/verification/bank/status` | JWT |
| POST | `/api/v1/verification/bank/verify` | JWT |

### Security

- Plain account number is never stored or returned
- Stored: `accountNumberMasked` (`XXXXXXXX9012`) + `accountNumberHash`
- Requires completed PAN verification
- Audit event: `BANK_VERIFIED`

### Frontend

- Route: `/verification/bank`
- On success → `/verification/summary`

### Docs

- Swagger: `http://localhost:4000/api-docs`
- Postman: `docs/LoanEx-Bank-Verification.postman_collection.json`
