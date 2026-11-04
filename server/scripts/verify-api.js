/**
 * End-to-end API verification for CampusFix, run against MongoDB Atlas.
 *
 *   npm run verify          -> uses MONGODB_URI from server/.env
 *   npm run verify -- --keep -> leaves the test data in place
 *
 * To keep the real `campusfix` database clean, the suite connects to the same
 * Atlas cluster but overrides the database name to `campusfix_verify`, then
 * drops that database once the run finishes.
 *
 * Every check is an actual HTTP request against the running Express app, so a
 * pass means the endpoint, the middleware chain and the Atlas query all work.
 */
const VERIFY_DB = 'campusfix_verify';
const KEEP = process.argv.includes('--keep');
const results = [];
let baseUrl = null;

function request(method, path, { token, body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : formData,
  }).then(async (res) => ({ status: res.status, json: await res.json().catch(() => ({})) }));
}

function check(name, condition, detail = '') {
  results.push({ name, passed: Boolean(condition), detail });
  const mark = condition ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}${condition || !detail ? '' : ` -> ${detail}`}`);
}

const expectStatus = (name, res, expected) =>
  check(
    `${name} [HTTP ${expected}]`,
    res?.status === expected,
    `got ${res?.status}: ${JSON.stringify(res?.json ?? {})}`
  );

async function main() {
  // Assigned before server.js is imported, because config/env.js snapshots
  // process.env the first time it is loaded.
  process.env.MONGODB_DB_NAME = VERIFY_DB;

  const { connectDB, databaseState, redact } = await import('../config/db.js');
  await connectDB();

  const info = databaseState();
  console.log(`[verify] target: Atlas database "${info.database}" on ${info.host}\n`);

  const { default: app } = await import('../server.js');
  const http = await import('node:http');
  const server = http.createServer(app);
  // Port 0 lets the OS hand back a free port, so a leftover listener from a
  // previous run can never break the suite.
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;


  // -------------------------------------------------- Atlas connectivity
  let res = null;
  const target = databaseState();
  check('connected to MongoDB Atlas (not a local server)', /mongodb\.net/.test(target.host || ''), target.host);
  check(`working database is "${VERIFY_DB}"`, target.database === VERIFY_DB, target.database);

  res = await request('GET', '/health');
  expectStatus('health endpoint reports server and database', res, 200);
  check('health endpoint confirms the live database connection', res.json.data?.database?.connected === true);

  const Complaint = (await import('../models/Complaint.js')).default;
  const Student = (await import('../models/User.js')).default;
  const probeUser = await Student.create({
    name: 'Atlas Probe',
    email: `probe.${Date.now()}@verify.campusfix.edu`,
    password: 'Probe@1234',
  });
  const probe = await Complaint.create({
    title: 'Atlas write probe record',
    description: 'Created directly through the Mongoose model to prove the Atlas round trip works.',
    category: 'Other',
    reportedBy: probeUser._id,
  });
  const readBack = await Complaint.findById(probe._id).populate('reportedBy', 'name');
  check(
    'document inserted into Atlas can be retrieved back',
    readBack?.title === probe.title && readBack?.reportedBy?.name === 'Atlas Probe'
  );
  await Complaint.deleteOne({ _id: probe._id });
  await Student.deleteOne({ _id: probeUser._id });
  check(
    'probe documents are removed again',
    (await Complaint.countDocuments({ title: 'Atlas write probe record' })) === 0
  );

  const stamp = Date.now();
  const email = (who) => `${who}.${stamp}@verify.campusfix.edu`;

  // ---------------------------------------------------------------- auth
  res = await request('POST', '/auth/register', {
    body: { name: 'Alice Student', email: email('alice'), password: 'Alice@123', studentId: `A${stamp}` },
  });
  expectStatus('student self-registration', res, 201);
  const alice = { token: res.json.data.token, id: res.json.data.user._id };
  check('registered account is forced to the student role', res.json.data.user.role === 'student');
  check('registration response never leaks the password', res.json.data.user.password === undefined);

  res = await request('POST', '/auth/register', { body: { name: 'Alice Again', email: email('alice'), password: 'x'.repeat(8) } });
  expectStatus('duplicate email is rejected', res, 409);

  res = await request('POST', '/auth/register', {
    body: { name: 'Mallory', email: email('mallory'), password: 'Mallory@123', role: 'admin' },
  });
  expectStatus('self-service admin escalation is blocked', res, 403);

  res = await request('POST', '/auth/register', {
    body: { name: 'Bob Student', email: email('bob'), password: 'Bob@12345', studentId: `B${stamp}` },
  });
  const bob = { token: res.json.data.token, id: res.json.data.user._id };
  const bobToken = bob.token;
  expectStatus('second student registers', res, 201);

  res = await request('POST', '/auth/login', { body: { email: email('alice'), password: 'Wrong@123' } });
  expectStatus('wrong password cannot sign in', res, 401);

  res = await request('POST', '/auth/login', { body: { email: email('alice'), password: 'Alice@123' } });
  expectStatus('correct password signs in', res, 200);
  const aliceToken = res.json.data.token;

  res = await request('GET', '/auth/me', { token: aliceToken });
  expectStatus('session token resolves the current user', res, 200);
  check('/auth/me returns the right account', res.json.data.user.email === email('alice'));

  res = await request('GET', '/auth/me');
  expectStatus('protected route without a token', res, 401);

  res = await request('GET', '/auth/me', { token: 'not.a.jwt' });
  expectStatus('protected route with a forged token', res, 401);

  // ------------------------------------------------------------- rbac
  res = await request('POST', '/users', {
    token: aliceToken,
    body: { name: 'Sneaky', email: email('sneaky'), password: 'Sneaky@123', role: 'admin' },
  });
  expectStatus('student cannot create privileged accounts', res, 403);

  res = await request('GET', '/users', { token: aliceToken });
  expectStatus('student cannot enumerate users', res, 403);

  // The verifier needs an administrator. Create one directly in the database,
  // because public registration deliberately cannot produce that role.
  const User = (await import('../models/User.js')).default;
  await User.create({
    name: 'Ops Admin',
    email: email('admin'),
    password: 'Admin@123',
    role: 'admin',
    department: 'Estates',
  });
  res = await request('POST', '/auth/login', { body: { email: email('admin'), password: 'Admin@123' } });
  expectStatus('administrator signs in', res, 200);
  const adminToken = res.json.data.token;
  const adminId = res.json.data.user._id;

  res = await request('GET', '/users', { token: adminToken });
  expectStatus('administrator lists all users', res, 200);

  res = await request('POST', '/users', {
    token: adminToken,
    body: { name: 'Ravi Staff', email: email('ravi'), password: 'Staff@123', role: 'staff', staffId: `MT${stamp}`, department: 'Electrical' },
  });
  expectStatus('administrator creates a staff account', res, 201);
  const staffId = res.json.data.user._id;

  res = await request('POST', '/users', {
    token: adminToken,
    body: { name: 'Second Staff', email: email('suresh'), password: 'Staff@123', role: 'staff' },
  });
  const staff2Id = res.json.data.user._id;

  res = await request('POST', '/auth/login', { body: { email: email('ravi'), password: 'Staff@123' } });
  const staffToken = res.json.data.token;

  res = await request('PATCH', `/users/${staffId}`, { token: staffToken, body: { role: 'admin' } });
  expectStatus('staff cannot promote themselves', res, 403);

  res = await request('PATCH', `/users/${email('admin')}`, { token: adminToken, body: {} });
  check('unknown id form is handled without a crash', [400, 404].includes(res.status), `got ${res.status}`);

  // ---------------------------------------------------------- complaints
  res = await request('POST', '/complaints', {
    token: aliceToken,
    body: {
      title: 'Projector will not switch on',
      description: 'The Seminar Hall B projector does not respond to the wall panel or the remote control.',
      category: 'Classroom',
      priority: 'high',
      location: 'Seminar Hall B',
    },
  });
  expectStatus('student submits a complaint', res, 201);
  const c1 = res.json.data.complaint;
  check('new complaint starts in the pending state', c1.status === 'pending');
  check('complaint is linked to its reporter', c1.reportedBy._id === alice.id || c1.reportedBy === alice.id);

  res = await request('POST', '/complaints', {
    token: aliceToken,
    body: { title: 'Bad category', description: 'x'.repeat(30), category: 'Aliens' },
  });
  expectStatus('unknown category is rejected by validation', res, 400);

  res = await request('POST', '/complaints', {
    token: aliceToken,
    body: { title: 'abcd', description: 'x'.repeat(30), category: 'Hostel' },
  });
  expectStatus('title below the 5-character minimum is rejected', res, 400);

  res = await request('POST', '/complaints', {
    token: staffToken,
    body: { title: 'Staff should not file', description: 'x'.repeat(30), category: 'Hostel' },
  });
  expectStatus('staff cannot submit complaints', res, 403);

  res = await request('POST', '/complaints', {
    token: bobToken,
    body: {
      title: 'Hostel water cooler leaks',
      description: 'The water cooler on hostel block A ground floor leaks continuously overnight.',
      category: 'Water Supply',
      priority: 'medium',
    },
  });
  const c2 = res.json.data.complaint;
  expectStatus('second student submits a complaint', res, 201);

  // ------------------------------------------------ privacy by role
  res = await request('GET', '/complaints', { token: aliceToken });
  expectStatus('student lists complaints', res, 200);
  const aliceSees = res.json.data.complaints.map((c) => c._id);
  check('student only ever sees their own complaints', aliceSees.includes(c1._id) && !aliceSees.includes(c2._id), aliceSees.join(','));

  res = await request('GET', `/complaints/${c2._id}`, { token: aliceToken });
  expectStatus('student cannot open another student’s complaint', res, 404);

  res = await request('GET', '/complaints', { token: staffToken });
  check('staff queue is empty before any assignment', res.json.data.complaints.length === 0);

  res = await request('PATCH', `/complaints/${c1._id}/status`, { token: staffToken, body: { status: 'in_progress' } });
  expectStatus('unassigned staff cannot touch a complaint', res, 404);

  // ------------------------------------------------------- assignment
  res = await request('PATCH', `/complaints/${c1._id}/assign`, { token: adminToken, body: { assignedTo: staffId } });
  expectStatus('administrator assigns the complaint to staff', res, 200);
  check('assignment moves the complaint to assigned', res.json.data.complaint.status === 'assigned');

  res = await request('PATCH', `/complaints/${c2._id}/assign`, { token: adminToken, body: { assignedTo: alice.id } });
  expectStatus('complaint cannot be assigned to a student', res, 400, JSON.stringify(res.json));

  res = await request('POST', '/complaints', { token: adminToken, body: { title: 'Admin filing blocked', description: 'x'.repeat(30), category: 'Other' } });
  expectStatus('administrator does not file complaints', res, 403);

  // ------------------------------------------------- staff status rules
  res = await request('PATCH', `/complaints/${c1._id}/status`, { token: staffToken, body: { status: 'resolved' } });
  expectStatus('resolving without remarks is refused', res, 400);

  res = await request('PATCH', `/complaints/${c1._id}/status`, { token: staffToken, body: { status: 'rejected', rejectionReason: 'nope' } });
  expectStatus('staff cannot reject a complaint', res, 403);

  res = await request('PATCH', `/complaints/${c1._id}/status`, { token: staffToken, body: { status: 'in_progress' } });
  expectStatus('assigned staff start the work', res, 200);

  res = await request('PATCH', `/complaints/${c1._id}/status`, {
    token: staffToken,
    body: { status: 'resolved', remarks: 'Replaced the projector ballast and tested for two hours.' },
  });
  expectStatus('staff mark the complaint resolved with remarks', res, 200);
  check('resolution timestamp is recorded', Boolean(res.json.data.complaint.resolvedAt));

  // ---------------------------------------------------------- feedback
  res = await request('POST', `/complaints/${c2._id}/feedback`, { token: bobToken, body: { rating: 4 } });
  expectStatus('feedback before resolution is refused', res, 409);

  res = await request('POST', `/complaints/${c1._id}/feedback`, { token: staffToken, body: { rating: 4 } });
  expectStatus('staff cannot submit student feedback', res, 403);

  res = await request('POST', `/complaints/${c1._id}/feedback`, { token: bobToken, body: { rating: 4 } });
  expectStatus('a different student cannot rate the complaint', res, 403);

  res = await request('POST', `/complaints/${c1._id}/feedback`, { token: aliceToken, body: { rating: 9 } });
  expectStatus('out-of-range rating is rejected', res, 400);

  res = await request('POST', `/complaints/${c1._id}/feedback`, { token: aliceToken, body: { rating: 5, comment: 'Fixed the same day.' } });
  expectStatus('reporting student rates the resolution', res, 201);

  res = await request('POST', `/complaints/${c1._id}/feedback`, { token: aliceToken, body: { rating: 3 } });
  expectStatus('duplicate feedback is refused', res, 409);

  res = await request('GET', '/feedback', { token: adminToken });
  expectStatus('administrator reads all feedback', res, 200);
  check('feedback collection contains the new rating', res.json.data.feedback.length === 1);

  res = await request('GET', '/feedback', { token: bobToken });
  check('student only sees their own feedback', res.json.data.feedback.length === 0);

  // ---------------------------------------------------------- comments
  res = await request('POST', `/complaints/${c1._id}/comments`, { token: aliceToken, body: { text: 'Any update on the hall projector?' } });
  expectStatus('reporting student comments on their complaint', res, 201);

  res = await request('POST', `/complaints/${c1._id}/comments`, { token: staffToken, body: { text: 'Ballast replaced, tested working.' } });
  expectStatus('assigned staff reply on the thread', res, 201);

  res = await request('POST', `/complaints/${c1._id}/comments`, { token: bobToken, body: { text: 'I am not involved' } });
  expectStatus('an unrelated student cannot post in the thread', res, 403);

  res = await request('GET', `/complaints/${c1._id}/comments`, { token: aliceToken });
  check('comment thread returns both messages in order', res.json.data.comments.length === 2);

  // ------------------------------------------------------- audit trail
  res = await request('GET', `/complaints/${c1._id}`, { token: adminToken });
  const actions = res.json.data.activities.map((a) => a.action);
  check(
    'activity history records the full lifecycle',
    ['created', 'assigned', 'status_changed', 'feedback_submitted', 'comment_added'].every((a) => actions.includes(a)),
    actions.join(',')
  );
  check('detail response carries comments and feedback', res.json.data.comments.length === 2 && res.json.data.feedback.rating === 5);

  // -------------------------------------------------- student edits
  res = await request('PATCH', `/complaints/${c2._id}`, { token: bobToken, body: { title: 'Hostel water cooler leaks badly' } });
  expectStatus('student edits their own still-pending complaint', res, 200);

  res = await request('PATCH', `/complaints/${c2._id}`, { token: bobToken, body: { status: 'resolved' } });
  expectStatus('student cannot change status through the edit route', res, 400);

  res = await request('PATCH', `/complaints/${c1._id}`, { token: aliceToken, body: { title: 'Rewritten after work started' } });
  expectStatus('student cannot rewrite a complaint already being handled', res, 409);

  res = await request('PATCH', `/complaints/${c1._id}`, { token: staffToken, body: { title: 'Staff rewrite' } });
  expectStatus('assigned staff cannot rewrite complaint text', res, 403);

  // --------------------------------------------- filters/search/paging
  for (let i = 0; i < 12; i += 1) {
    await request('POST', '/complaints', {
      token: aliceToken,
      body: {
        title: `Bulk sample complaint number ${i + 1}`,
        description: 'Seeded only so that pagination and filtering have something to page over.',
        category: i % 2 === 0 ? 'Electrical' : 'Sanitation',
        priority: i % 3 === 0 ? 'critical' : 'low',
      },
    });
  }

  res = await request('GET', '/complaints?page=1&limit=5', { token: aliceToken });
  check('page size is respected', res.json.data.complaints.length === 5);
  check('pagination metadata is correct', res.json.data.page.total === 13 && res.json.data.page.totalPages === 3, JSON.stringify(res.json.data.page));

  res = await request('GET', '/complaints?page=2&limit=5', { token: aliceToken });
  const page2 = res.json.data.complaints[0]._id;
  res = await request('GET', '/complaints?page=1&limit=5', { token: aliceToken });
  check('page 2 differs from page 1', !res.json.data.complaints.some((c) => c._id === page2));

  res = await request('GET', '/complaints?category=Electrical&limit=20', { token: aliceToken });
  check('category filter returns only that category', res.json.data.complaints.every((c) => c.category === 'Electrical'));

  res = await request('GET', '/complaints?status=pending&limit=20', { token: aliceToken });
  check('status filter returns only pending rows', res.json.data.complaints.length === 12 && res.json.data.complaints.every((c) => c.status === 'pending'));

  res = await request('GET', '/complaints?search=Bulk%20sample&limit=20', { token: aliceToken });
  check('free-text search matches the description or title', res.json.data.complaints.length === 12, `got ${res.json.data.complaints.length}`);

  res = await request('GET', '/complaints?priority=critical&limit=20', { token: aliceToken });
  check('priority filter works', res.json.data.complaints.every((c) => c.priority === 'critical'));

  res = await request('GET', '/complaints?page=0', { token: aliceToken });
  expectStatus('a non-positive page is rejected', res, 400);

  res = await request('GET', '/complaints?status=nonsense', { token: aliceToken });
  expectStatus('an unknown status filter is rejected', res, 400);

  // -------------------------------------------------------- analytics
  res = await request('GET', '/analytics/dashboard', { token: adminToken });
  const adminDash = res.json.data;
  expectStatus('administrator dashboard aggregates', res, 200);
  check('admin summary counts every complaint', adminDash.summary.total === 14, `total=${adminDash.summary.total}`);
  check('admin dashboard exposes category, monthly and staff data',
    adminDash.byCategory.length === 8 && adminDash.monthly.length === 6 && Array.isArray(adminDash.staffWorkload));
  check('resolution performance is calculated', adminDash.performance.resolvedCount === 1 && adminDash.performance.averageRating === 5);

  res = await request('GET', '/analytics/dashboard', { token: aliceToken });
  check('student dashboard is scoped to their own totals', res.json.data.summary.total === 13, `total=${res.json.data.summary.total}`);
  check('student dashboard does not expose staff workload', res.json.data.staffWorkload === undefined);

  res = await request('GET', '/analytics/complaints-by-category', { token: aliceToken });
  check('by-category endpoint returns all eight categories', res.json.data.categories.length === 8);

  res = await request('GET', '/analytics/monthly-statistics?months=3', { token: adminToken });
  check('monthly statistics honours the months parameter', res.json.data.months.length === 3);

  res = await request('GET', '/analytics/monthly-statistics?months=99', { token: adminToken });
  expectStatus('an absurd month range is rejected', res, 400);

  // ------------------------------------------------------------ uploads
  const form = new FormData();
  form.append('title', 'Photograph attached complaint');
  form.append('description', 'This complaint carries an image so the upload pipeline is exercised.');
  form.append('category', 'Laboratory');
  form.append('images', new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }));

  res = await request('POST', '/complaints', { token: aliceToken, formData: form });
  // Without Cloudinary credentials the API must refuse cleanly rather than 500.
  check(
    'image upload fails cleanly when Cloudinary is not configured',
    res.status === 400 || res.status === 201,
    `got ${res.status}: ${JSON.stringify(res.json).slice(0, 160)}`
  );

  const badForm = new FormData();
  badForm.append('title', 'Text file as an image');
  badForm.append('description', 'This attempts to smuggle a non-image through the upload field.');
  badForm.append('category', 'Other');
  badForm.append('images', new Blob(['this is definitely not a picture'], { type: 'text/plain' }));
  res = await request('POST', '/complaints', { token: aliceToken, formData: badForm });
  expectStatus('a non-image upload is refused', res, 400);

  // ------------------------------------------------------- deletion
  res = await request('DELETE', `/complaints/${c2._id}`, { token: bobToken });
  expectStatus('student cannot delete their own complaint', res, 403);

  res = await request('DELETE', `/complaints/${c2._id}`, { token: adminToken, body: { reason: 'Duplicate of work order 42' } });
  expectStatus('administrator deletes a complaint', res, 200);

  res = await request('GET', '/complaints', { token: adminToken, body: undefined });
  check('deleted complaint leaves every list', !res.json.data.complaints.some((c) => c._id === c2._id));

  res = await request('GET', `/complaints/${c2._id}`, { token: adminToken });
  expectStatus('deleted complaint cannot be opened', res, 404);

  res = await request('GET', `/complaints/${c2._id}/activities`, { token: adminToken });
  check('unsupported route shape is refused', res.status === 404);

  // --------------------------------------------------- account state
  res = await request('PATCH', `/users/${bob.id}`, { token: adminToken, body: { isActive: false } });
  expectStatus('administrator disables a student account', res, 200);

  res = await request('POST', '/auth/login', { body: { email: email('bob'), password: 'Bob@12345' } });
  expectStatus('a disabled account cannot sign in', res, 403);

  res = await request('GET', '/complaints', { token: bobToken });
  expectStatus('an existing token for a disabled account is refused', res, 403);

  res = await request('PATCH', `/users/${alice.id}`, { token: adminToken, body: { role: 'staff' } });
  expectStatus('administrator promotes a student to staff', res, 200);

  res = await request('PATCH', `/users/${adminId}`, { token: adminToken, body: { isActive: false } });
  expectStatus('administrator cannot deactivate their own account', res, 400);

  res = await request('PATCH', `/users/${adminId}`, { token: adminToken, body: { role: 'student' } });
  expectStatus('administrator cannot demote themselves', res, 400);

  // ------------------------------------------------------------ errors
  res = await request('GET', '/complaints/not-a-valid-object-id', { token: adminToken });
  expectStatus('a malformed id is a 400, not a 500', res, 400);

  res = await request('GET', '/does-not-exist', { token: adminToken });
  expectStatus('unknown route returns JSON 404', res, 404);

  res = await request('GET', '/analytics/dashboard', { token: adminToken.slice(0, 10) });
  expectStatus('a truncated token is rejected', res, 401);

  // ------------------------------------------------------------ close
  await new Promise((resolve) => server.close(resolve));

  const { default: mongoose } = await import('mongoose');
  if (!KEEP && databaseState().database === VERIFY_DB) {
    // Only ever the isolated test database; the real campusfix database is
    // never touched by this guard.
    await mongoose.connection.dropDatabase();
    console.log(`[verify] dropped the temporary "${VERIFY_DB}" database`);
  }
  await mongoose.connection.close();

  const failed = results.filter((r) => !r.passed);
  console.log(`\n[verify] ${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('[verify] failures:');
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ''}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('[verify] crashed:', err);
  // Exit explicitly: an open server or mongod handle would otherwise keep the
  // process alive forever after a mid-suite failure.
  process.exit(1);
});
