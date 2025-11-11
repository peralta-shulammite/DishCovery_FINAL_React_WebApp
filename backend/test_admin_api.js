/**
 * Simple API Test Script for Admin Creation and Verification Flow
 * 
 * Usage:
 *   node test_admin_api.js
 * 
 * Make sure your backend server is running on http://localhost:5000
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Test admin credentials (you'll need to get a valid admin token first)
const TEST_ADMIN_EMAIL = 'testadmin@example.com';
const TEST_ADMIN_PASSWORD = 'testpassword123';

let adminToken = '';
let createdAdminEmail = '';
let verificationCode = '';

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', body = null, token = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    return { status: 0, data: { error: error.message }, ok: false };
  }
}

// Test 1: Admin Login (to get token for creating other admins)
async function testAdminLogin() {
  console.log('\n📋 Test 1: Admin Login');
  console.log('='.repeat(60));
  
  // You need to provide a valid admin email/password here
  // Or skip this test if you already have a token
  const result = await apiCall('/admin-auth/login', 'POST', {
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD
  });

  if (result.ok && result.data.token) {
    adminToken = result.data.token;
    console.log('✅ Admin login successful');
    console.log(`   Token: ${adminToken.substring(0, 20)}...`);
    return true;
  } else {
    console.log('❌ Admin login failed');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.data.message || result.data.error}`);
    console.log('\n⚠️  Note: You may need to provide a valid admin email/password');
    console.log('   Or set adminToken manually in the script');
    return false;
  }
}

// Test 2: Create Admin
async function testCreateAdmin() {
  console.log('\n📋 Test 2: Create Admin');
  console.log('='.repeat(60));
  
  const timestamp = Date.now();
  createdAdminEmail = `testadmin${timestamp}@example.com`;
  
  const result = await apiCall('/admin-auth/create', 'POST', {
    firstName: 'Test',
    lastName: 'Admin',
    email: createdAdminEmail,
    password: 'testpassword123'
  }, adminToken);

  if (result.ok && result.data.success) {
    console.log('✅ Admin created successfully');
    console.log(`   Admin ID: ${result.data.admin?.adminId}`);
    console.log(`   Email: ${result.data.admin?.email}`);
    console.log(`   Message: ${result.data.message}`);
    console.log('\n📧 Check your email for verification code!');
    console.log(`   Email sent to: ${createdAdminEmail}`);
    return true;
  } else {
    console.log('❌ Admin creation failed');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.data.message || result.data.error}`);
    return false;
  }
}

// Test 3: Verify Admin (you'll need to enter the code manually)
async function testVerifyAdmin(code) {
  console.log('\n📋 Test 3: Verify Admin');
  console.log('='.repeat(60));
  
  if (!code) {
    console.log('⚠️  No verification code provided');
    console.log('   Usage: testVerifyAdmin("123456")');
    return false;
  }

  const result = await apiCall('/admin-auth/verify', 'POST', {
    email: createdAdminEmail,
    code: code
  });

  if (result.ok && result.data.success) {
    console.log('✅ Admin verification successful');
    console.log(`   Admin ID: ${result.data.admin?.adminId}`);
    console.log(`   Email: ${result.data.admin?.email}`);
    console.log(`   Message: ${result.data.message}`);
    return true;
  } else {
    console.log('❌ Admin verification failed');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.data.message || result.data.error}`);
    return false;
  }
}

// Test 4: Test Invalid Code
async function testInvalidCode() {
  console.log('\n📋 Test 4: Test Invalid Code');
  console.log('='.repeat(60));
  
  const result = await apiCall('/admin-auth/verify', 'POST', {
    email: createdAdminEmail,
    code: '000000' // Wrong code
  });

  if (!result.ok && result.status === 400) {
    console.log('✅ Invalid code correctly rejected');
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.data.message}`);
    return true;
  } else {
    console.log('❌ Invalid code test failed');
    console.log(`   Status: ${result.status}`);
    console.log(`   Response: ${JSON.stringify(result.data)}`);
    return false;
  }
}

// Test 5: List Admins
async function testListAdmins() {
  console.log('\n📋 Test 5: List Admins');
  console.log('='.repeat(60));
  
  const result = await apiCall('/admin-auth/list', 'GET', null, adminToken);

  if (result.ok && result.data.success) {
    console.log('✅ Admins list retrieved successfully');
    console.log(`   Total admins: ${result.data.admins?.length || 0}`);
    if (result.data.admins && result.data.admins.length > 0) {
      console.log('\n   Sample admin:');
      const sample = result.data.admins[0];
      console.log(`     ID: ${sample.adminId}`);
      console.log(`     Name: ${sample.firstName} ${sample.lastName}`);
      console.log(`     Email: ${sample.email}`);
      console.log(`     Status: ${sample.status}`);
    }
    return true;
  } else {
    console.log('❌ Failed to list admins');
    console.log(`   Status: ${result.status}`);
    console.log(`   Error: ${result.data.message || result.data.error}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Admin API Tests');
  console.log('='.repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Test Admin Email: ${TEST_ADMIN_EMAIL}`);
  
  const results = {
    login: false,
    create: false,
    verify: false,
    invalidCode: false,
    list: false
  };

  // Test 1: Login (optional - you can skip if you have a token)
  try {
    results.login = await testAdminLogin();
  } catch (error) {
    console.log('⚠️  Login test skipped or failed');
  }

  // If no token, prompt user to set it manually
  if (!adminToken) {
    console.log('\n⚠️  No admin token available. You can:');
    console.log('   1. Set adminToken manually in the script');
    console.log('   2. Or provide valid TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD');
    console.log('\n   For now, skipping tests that require authentication...');
  }

  // Test 2: Create Admin (requires token)
  if (adminToken) {
    try {
      results.create = await testCreateAdmin();
    } catch (error) {
      console.log('❌ Create admin test failed:', error.message);
    }
  }

  // Test 3: Verify Admin (requires code from email)
  if (results.create) {
    console.log('\n📝 To test verification:');
    console.log(`   Check email: ${createdAdminEmail}`);
    console.log('   Then run: testVerifyAdmin("YOUR_CODE_HERE")');
    console.log('\n   Or modify this script to include the code automatically');
  }

  // Test 4: Test Invalid Code
  if (results.create) {
    try {
      results.invalidCode = await testInvalidCode();
    } catch (error) {
      console.log('❌ Invalid code test failed:', error.message);
    }
  }

  // Test 5: List Admins (requires token)
  if (adminToken) {
    try {
      results.list = await testListAdmins();
    } catch (error) {
      console.log('❌ List admins test failed:', error.message);
    }
  }

  // Summary
  console.log('\n\n📊 Test Summary');
  console.log('='.repeat(60));
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${test.padEnd(15)}: ${status}`);
  });

  console.log('\n💡 Tips:');
  console.log('   - Make sure your backend server is running');
  console.log('   - Check your email for verification codes');
  console.log('   - Verify codes expire after 10 minutes');
  console.log('   - Check database for pending_requests entries');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

// Export functions for manual testing
export {
  testAdminLogin,
  testCreateAdmin,
  testVerifyAdmin,
  testInvalidCode,
  testListAdmins,
  runTests
};

