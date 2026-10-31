# Team Management & Branch Assignment API Documentation

OpenAPI 3.1 specification for Employee Invitations, Branch Assignments, and Role Governance.

---

## 1. OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: Tea Chain ERP - Team Management API
  version: 1.0.0
  description: Staff onboarding, branch assignment, and invitation lifecycles.

paths:
  /rest/v1/organization_invitations:
    get:
      summary: List Invitations
      description: Lists active and historical staff invitation tokens.
      operationId: getInvitations
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Invitations list.
    post:
      summary: Create Employee Invitation
      description: Generates a cryptographically secure token, records the invitation, and sends the onboarding link via Resend.
      operationId: createInvitation
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, role_id, location_id]
              properties:
                email:
                  type: string
                  format: email
                role_id:
                  type: string
                  format: uuid
                location_id:
                  type: string
                  format: uuid
      responses:
        '201':
          description: Invitation sent.

  /rpc/validate_invitation_token:
    post:
      summary: Validate Invitation Token (RPC)
      description: Validates an invitation link hash during employee onboarding, ensuring it has not expired or already been accepted.
      operationId: validateInvitationToken
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [p_token_hash]
              properties:
                p_token_hash:
                  type: string
      responses:
        '200':
          description: Invitation metadata (organization name, assigned role, location).

  /rpc/get_my_employee_info:
    post:
      summary: Get Current Employee Context (RPC)
      description: Fetches active role, assigned branch `location_id`, organization name, and employee profile for the current user.
      operationId: getMyEmployeeInfo
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Employee context object.
```

---

## 2. Server Action Reference

### Team & Invitations (`modules/team/services/invitation.actions.ts`)
- `inviteEmployee(data)`: Validates via `inviteEmployeeSchema`. Computes SHA-256 token hash, inserts into `organization_invitations`, and triggers an HTML invitation email using the Resend API.
- `acceptInvitation(data)`: Links authenticated Supabase user profile to `organization_memberships` with the assigned `location_id` and role.

