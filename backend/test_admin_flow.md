# Admin Creation and Verification Flow Test

## Test Steps

### 1. Admin Creation Flow
1. **Endpoint**: `POST /api/admin-auth/create`
2. **Required Fields**: `firstName`, `lastName`, `email`, `password`
3. **Expected Behavior**:
   - Admin is created in `admin_users` table
   - Verification code is generated (6 digits)
   - Code is stored in `pending_requests` with:
     - `user_id`: placeholder from `users` table
     - `request_type`: `'admin_email_verification'`
     - `request_data`: JSON with `admin_id` and `verification_code`
     - `status`: `'pending'`
     - `created_at`: current timestamp
   - Verification email is sent via SendGrid
   - Response includes admin details

### 2. Admin Verification Flow
1. **Endpoint**: `POST /api/admin-auth/verify`
2. **Required Fields**: `email`, `code`
3. **Expected Behavior**:
   - Admin is found by email
   - Verification request is found using:
     - `request_type = 'admin_email_verification'`
     - `status = 'pending'`
     - `CAST(JSON_EXTRACT(request_data, '$.admin_id') AS UNSIGNED) = adminId`
   - Verification code is extracted from JSON
   - Code is compared (case-insensitive, trimmed)
   - Expiration is checked (10 minutes from `created_at`)
   - Request is marked as `completed`
   - Response includes success message

### 3. Database Structure Verification

#### admin_users table should have:
- `admin_id` (PRIMARY KEY, AUTO_INCREMENT)
- `username`
- `email`
- `password_hash`
- `first_name`
- `last_name`
- `is_active`
- `created_at`
- `last_login` (nullable)
- `updated_at` (nullable)

#### pending_requests table should have:
- `request_id` (PRIMARY KEY, AUTO_INCREMENT)
- `user_id` (FOREIGN KEY to `users.user_id`)
- `request_type` (VARCHAR)
- `request_data` (TEXT/JSON)
- `status` (VARCHAR)
- `created_at` (DATETIME)

### 4. Common Issues to Check

1. **Foreign Key Constraint**: 
   - ✅ Fixed: Uses placeholder `user_id` from `users` table
   - ✅ Fixed: Stores `admin_id` in `request_data` JSON

2. **Verification Code Storage**:
   - ✅ Fixed: `created_at` is set to current time (not future time)
   - ✅ Fixed: Code is stored in JSON format

3. **Verification Code Retrieval**:
   - ✅ Fixed: Queries using `admin_id` from JSON
   - ✅ Fixed: Parses JSON to extract verification code
   - ✅ Fixed: Compares codes correctly

4. **Expiration Check**:
   - ✅ Fixed: Calculates from `created_at` (not future time)
   - ✅ Fixed: 10 minute expiration window

### 5. Test Cases

#### Test Case 1: Create Admin
```bash
POST /api/admin-auth/create
Headers: { Authorization: Bearer <admin_token> }
Body: {
  "firstName": "Test",
  "lastName": "Admin",
  "email": "testadmin@example.com",
  "password": "password123"
}
```

**Expected Response**:
- Status: 201
- Body: { success: true, message: "...", admin: {...} }
- Check: Verification code sent via email

#### Test Case 2: Verify Admin
```bash
POST /api/admin-auth/verify
Body: {
  "email": "testadmin@example.com",
  "code": "123456"  // From email
}
```

**Expected Response**:
- Status: 200
- Body: { success: true, message: "...", admin: {...} }
- Check: Request status changed to 'completed'

#### Test Case 3: Invalid Code
```bash
POST /api/admin-auth/verify
Body: {
  "email": "testadmin@example.com",
  "code": "000000"  // Wrong code
}
```

**Expected Response**:
- Status: 400
- Body: { success: false, message: "Invalid or expired verification code" }

#### Test Case 4: Expired Code
- Wait 11 minutes after admin creation
- Try to verify with the code

**Expected Response**:
- Status: 400
- Body: { success: false, message: "Verification code has expired..." }

