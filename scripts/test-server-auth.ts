import http from 'http';

console.log('--- TEST: Backend Server, Auth & Database Persistence ---');

const PORT = 3001;

function makeRequest(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data).toString(),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers,
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => {
          resData += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(resData);
            resolve({ status: res.statusCode || 200, body: json });
          } catch {
            resolve({ status: res.statusCode || 200, body: resData });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  const testUser = `company_engineer_${Date.now()}`;
  const testEmail = `${testUser}@enterprise.io`;
  const testPassword = 'SecureCompanyPassword!2026';

  console.log(`\n1. Registering user: ${testUser}`);
  const regRes = await makeRequest('POST', '/api/auth/register', {
    username: testUser,
    email: testEmail,
    password: testPassword,
    displayName: 'Chief Lead Architect',
  });

  console.log('Registration status:', regRes.status);
  console.log('User created:', regRes.body.user);
  if (regRes.status !== 201 || !regRes.body.token) {
    throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
  }

  const token = regRes.body.token;

  console.log('\n2. Testing authentication login with valid password:');
  const loginRes = await makeRequest('POST', '/api/auth/login', {
    identifier: testUser,
    password: testPassword,
  });
  console.log('Login status:', loginRes.status);
  if (loginRes.status !== 200 || !loginRes.body.token) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
  }

  console.log('\n3. Testing login failure with invalid password:');
  const wrongLoginRes = await makeRequest('POST', '/api/auth/login', {
    identifier: testUser,
    password: 'WrongPassword123',
  });
  console.log('Wrong login status:', wrongLoginRes.status, wrongLoginRes.body);
  if (wrongLoginRes.status !== 401) {
    throw new Error('Expected 401 for wrong password');
  }

  console.log('\n4. Verifying /api/auth/me with JWT token:');
  const meRes = await makeRequest('GET', '/api/auth/me', undefined, token);
  console.log('/api/auth/me result:', meRes.body.user);
  if (meRes.status !== 200 || meRes.body.user.username !== testUser) {
    throw new Error('GetMe verification failed');
  }

  console.log('\n5. Saving a production circuit into SQLite database:');
  const saveCircuitRes = await makeRequest(
    'POST',
    '/api/circuits',
    {
      name: '4-Bit Ripple Counter Module',
      circuit: {
        components: [
          { id: 'c1', type: 'ic_7493', label: '74LS93', x: 100, y: 100, inputs: [], outputs: [] },
        ],
        wires: [],
      },
    },
    token
  );
  console.log('Save circuit response:', saveCircuitRes.body);
  if (saveCircuitRes.status !== 200) {
    throw new Error('Save circuit failed');
  }

  console.log('\n6. Fetching saved circuits from SQLite database:');
  const getCircuitsRes = await makeRequest('GET', '/api/circuits', undefined, token);
  console.log('Circuits count for user:', getCircuitsRes.body.circuits.length);
  if (getCircuitsRes.body.circuits.length === 0) {
    throw new Error('Circuit was not retrieved from DB');
  }

  console.log('\n7. Saving modular Custom IC into SQLite database:');
  const saveICRes = await makeRequest(
    'POST',
    '/api/custom-ics',
    {
      id: `ic_modular_${Date.now()}`,
      name: 'Hex Logic Unit DIP-20',
      partNumber: '74CORP-01',
      description: 'Enterprise company modular IC',
      pinCount: 20,
      vccPin: 20,
      gndPin: 10,
      gateUnits: [
        {
          id: 'u1',
          name: '2-in AND',
          gateType: 'and',
          inputPins: [1, 2],
          outputPins: [3],
        },
      ],
      pins: [],
    },
    token
  );
  console.log('Save Custom IC status:', saveICRes.status);
  if (saveICRes.status !== 200) {
    throw new Error('Save Custom IC failed');
  }

  console.log('\n8. Fetching Custom ICs from SQLite database:');
  const getICsRes = await makeRequest('GET', '/api/custom-ics', undefined, token);
  console.log('Custom ICs count:', getICsRes.body.customICs.length);
  if (getICsRes.body.customICs.length === 0) {
    throw new Error('Custom IC was not retrieved from DB');
  }

  console.log('\n🎉 ALL BACKEND, AUTH, JWT & DATABASE PERSISTENCE TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('Server test error:', err);
  process.exit(1);
});
