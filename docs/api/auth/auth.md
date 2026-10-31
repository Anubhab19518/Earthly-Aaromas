# Authentication & Identity API Documentation

OpenAPI 3.1 specification for Authentication, MFA, and Organization bootstrapping workflows in Tea Chain ERP.

---

## 1. OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: Tea Chain ERP - Authentication API
  version: 1.0.0
  description: Authentication, Multi-Factor Authentication (TOTP), and Organization setup APIs.

paths:
  /auth/login:
    post:
      summary: Authenticate User
      description: Logs in an owner or employee using Supabase Auth email and password credentials.
      operationId: login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                  format: email
                  example: owner@chai-chain.com
                password:
                  type: string
                  format: password
                  example: "SecretPassword123!"
      responses:
        '200':
          description: Successful login. Sets session cookies and returns role redirect.
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  roleCode:
                    type: string
                    enum: [OWNER, EMPLOYEE]
                    example: OWNER
                  redirectUrl:
                    type: string
                    example: /dashboard
        '400':
          description: Invalid credentials or validation failure.

  /rpc/bootstrap_organization:
    post:
      summary: Bootstrap Organization (RPC)
      description: Atomically initializes an organization tenant, seeds roles and default permissions, and designates the caller profile as the active OWNER.
      operationId: bootstrapOrganization
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [p_org_name, p_owner_full_name]
              properties:
                p_org_name:
                  type: string
                  example: "Chai Aur Kolkata"
                p_owner_full_name:
                  type: string
                  example: "Anubhab Owner"
      responses:
        '200':
          description: Returns generated organization ID.
          content:
            application/json:
              schema:
                type: string
                format: uuid
        '401':
          description: Caller unauthenticated or missing valid profile.

  /rpc/get_my_role_code:
    post:
      summary: Get Current User Role Code (RPC)
      description: Fast RPC returning the active role code (`OWNER` or `EMPLOYEE`) for the authenticated user.
      operationId: getMyRoleCode
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Active role code string.
          content:
            application/json:
              schema:
                type: string
                example: "OWNER"

  /rpc/has_mfa_assurance:
    post:
      summary: Verify MFA AAL2 Level (RPC)
      description: Returns true if the caller's JWT claims include Authenticator Assurance Level 2 (AAL2).
      operationId: hasMfaAssurance
      security:
        - BearerAuth: []
      responses:
        '200':
          description: MFA verification boolean.
          content:
            application/json:
              schema:
                type: boolean
                example: true
```

---

## 2. Server Action Reference

### `signInWithEmail(formData)`
- **File**: `modules/auth/services/auth.actions.ts`
- **Schema**: `authSchema` (`email`, `password`)
- **Behavior**: Calls Supabase Auth `signInWithPassword`. Fetches user role from `get_my_role_code`. For `OWNER`, checks MFA level; redirects to `/mfa/verify` if unverified, otherwise to `/dashboard`. For `EMPLOYEE`, sets role cookie and redirects to `/employee`.

### `bootstrapOrganizationAction(formData)`
- **File**: `modules/auth/services/organization.actions.ts`
- **Schema**: `organizationSchema` (`name`, `ownerFullName`)
- **Behavior**: Invokes database function `bootstrap_organization`. Initializes business tenant.

