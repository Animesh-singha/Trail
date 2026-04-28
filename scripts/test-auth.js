const bcrypt = require('bcryptjs');

async function testAuth() {
  const password = 'YoForex@101';
  console.log('Testing Password:', password);

  // 1. Hash
  const startHash = Date.now();
  const hash = await bcrypt.hash(password, 10);
  console.log('Generated Hash:', hash);
  console.log('Hashing took:', Date.now() - startHash, 'ms');

  // 2. Verify Success
  const isMatch = await bcrypt.compare(password, hash);
  console.log('Verification (Correct Password):', isMatch ? 'SUCCESS ✅' : 'FAILED ❌');

  // 3. Verify Failure
  const isWrongMatch = await bcrypt.compare('WrongPassword123', hash);
  console.log('Verification (Wrong Password):', !isWrongMatch ? 'SUCCESS (Blocked) ✅' : 'FAILED (Allowed) ❌');

  if (isMatch && !isWrongMatch) {
    console.log('\nResult: All Auth Logic Passed! 🚀');
    process.exit(0);
  } else {
    console.log('\nResult: Test Failed! 🛑');
    process.exit(1);
  }
}

testAuth().catch(err => {
  console.error(err);
  process.exit(1);
});
