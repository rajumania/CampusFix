/**
 * Demo data for CampusFix. Kept as an importable module so both the `npm run
 * seed` CLI and `npm run dev:local` can use it.
 */
import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import Comment from '../models/Comment.js';
import Activity from '../models/Activity.js';
import Feedback from '../models/Feedback.js';
import { recordActivity } from '../services/activityLog.js';
import { COMPLAINT_STATUS, ROLES } from '../utils/constants.js';

export const DEMO_LOGIN_HINTS = [
  { role: 'Administrator', email: 'admin@campusfix.edu', password: 'Admin@123' },
  { role: 'Student', email: 'arjun@student.campusfix.edu', password: 'Student@123' },
  { role: 'Maintenance staff', email: 'ravi.staff@campusfix.edu', password: 'Staff@123' },
];

const ACCOUNTS = [
  { name: 'Priya Sharma', email: 'admin@campusfix.edu', password: 'Admin@123', role: ROLES.ADMIN, department: 'Administration' },
  { name: 'Ravi Kumar', email: 'ravi.staff@campusfix.edu', password: 'Staff@123', role: ROLES.STAFF, staffId: 'MT-001', department: 'Electrical Maintenance' },
  { name: 'Anita Desai', email: 'anita.staff@campusfix.edu', password: 'Staff@123', role: ROLES.STAFF, staffId: 'MT-002', department: 'Hostel Facilities' },
  { name: 'Arjun Verma', email: 'arjun@student.campusfix.edu', password: 'Student@123', role: ROLES.STUDENT, studentId: 'CSE21001', department: 'Computer Science' },
  { name: 'Sneha Iyer', email: 'sneha@student.campusfix.edu', password: 'Student@123', role: ROLES.STUDENT, studentId: 'ECE21014', department: 'Electronics' },
  { name: 'Karan Patel', email: 'karan@student.campusfix.edu', password: 'Student@123', role: ROLES.STUDENT, studentId: 'ME21032', department: 'Mechanical' },
];

const REPORTS = [
  {
    title: 'Seminar hall projector not powering on',
    description: 'The ceiling projector in Seminar Hall B does not switch on from the wall panel. We tried both remote and manual buttons during the 10 am lab session.',
    category: 'Classroom',
    priority: 'high',
    location: 'Seminar Hall B, Academic Block 2',
    by: 'arjun@student.campusfix.edu',
    status: COMPLAINT_STATUS.RESOLVED,
    assigned: 'ravi.staff@campusfix.edu',
    remarks: 'Replaced the failed ballast and tested the projector for two hours.',
    rating: 5,
    daysAgo: 40,
  },
  {
    title: 'Hostel wing C has no hot water',
    description: 'Solar water heaters on wing C appear to be offline since Monday. Around sixty residents are affected and the electric backup is also tripping.',
    category: 'Hostel',
    priority: 'critical',
    location: 'Hostel Wing C, first floor',
    by: 'karan@student.campusfix.edu',
    status: COMPLAINT_STATUS.IN_PROGRESS,
    assigned: 'anita.staff@campusfix.edu',
    daysAgo: 5,
  },
  {
    title: 'Wi-Fi drops repeatedly in the CS lab',
    description: 'The connection in Computer Lab 3 disconnects every few minutes, which breaks our online judge submissions. Other floors stay connected fine.',
    category: 'Internet/Wi-Fi',
    priority: 'medium',
    location: 'Computer Lab 3, Academic Block 1',
    by: 'sneha@student.campusfix.edu',
    status: COMPLAINT_STATUS.ASSIGNED,
    assigned: 'ravi.staff@campusfix.edu',
    daysAgo: 2,
  },
  {
    title: 'Water cooler leaking near the canteen',
    description: 'The drinking water cooler beside the canteen leaks continuously and the floor is permanently wet, which is a slipping hazard.',
    category: 'Water Supply',
    priority: 'medium',
    location: 'Main canteen corridor',
    by: 'arjun@student.campusfix.edu',
    status: COMPLAINT_STATUS.PENDING,
    daysAgo: 1,
  },
  {
    title: 'Chemistry lab fume hood fan dead',
    description: 'The exhaust fan in the chemistry fume hood does not run, so acid vapour stays in the room during practicals. Safety concern for the whole batch.',
    category: 'Laboratory',
    priority: 'critical',
    location: 'Chemistry Lab, Ground floor',
    by: 'karan@student.campusfix.edu',
    status: COMPLAINT_STATUS.PENDING,
    daysAgo: 0,
  },
  {
    title: 'Corridor tube lights flicker on block 1 second floor',
    description: 'Three tube lights near the staircase flicker and buzz throughout the evening, and one of them is completely dead.',
    category: 'Electrical',
    priority: 'low',
    location: 'Academic Block 1, second floor corridor',
    by: 'sneha@student.campusfix.edu',
    status: COMPLAINT_STATUS.REJECTED,
    rejectionReason: 'Duplicate of an open work order already raised by the facilities team.',
    daysAgo: 12,
  },
  {
    title: 'Washroom fittings broken in hostel block A',
    description: 'The taps in two washrooms on hostel block A ground floor do not shut off, wasting water all night and flooding the passage.',
    category: 'Sanitation',
    priority: 'high',
    location: 'Hostel Block A, ground floor washroom',
    by: 'karan@student.campusfix.edu',
    status: COMPLAINT_STATUS.RESOLVED,
    assigned: 'anita.staff@campusfix.edu',
    remarks: 'Replaced four tap assemblies and cleared the flooded passage.',
    rating: 4,
    daysAgo: 25,
  },
  {
    title: 'Notice board display panel is blank',
    description: 'The digital notice board outside the admin office shows nothing since Friday, so departmental announcements are not reaching students.',
    category: 'Other',
    priority: 'low',
    location: 'Administrative Block entrance',
    by: 'arjun@student.campusfix.edu',
    status: COMPLAINT_STATUS.PENDING,
    daysAgo: 3,
  },
];

async function clearAll() {
  const counts = await Promise.all([
    User.deleteMany({}),
    Complaint.deleteMany({}),
    Comment.deleteMany({}),
    Activity.deleteMany({}),
    Feedback.deleteMany({}),
  ]);
  return counts.reduce((sum, r) => sum + r.deletedCount, 0);
}

async function ensureUsers() {
  const created = [];
  for (const account of ACCOUNTS) {
    if (await User.findOne({ email: account.email })) continue;
    await User.create(account);
    created.push(account.email);
  }
  return created;
}

export async function runSeed({ fresh = false, quiet = false } = {}) {
  const log = (...args) => !quiet && console.log(...args);

  if (fresh) {
    log(`[seed] cleared ${await clearAll()} documents`);
  }

  const newUsers = await ensureUsers();
  log(newUsers.length ? `[seed] created accounts: ${newUsers.join(', ')}` : '[seed] demo accounts already present');

  const allUsers = await User.find();
  const byEmail = new Map(allUsers.map((u) => [u.email, u]));

  let made = 0;
  for (const report of REPORTS) {
    if (await Complaint.findOne({ title: report.title })) continue;

    const student = byEmail.get(report.by);
    const staff = report.assigned ? byEmail.get(report.assigned) : null;
    const admin = byEmail.get('admin@campusfix.edu');

    const createdAt = new Date(Date.now() - report.daysAgo * 86400000);
    const resolvedAt = report.status === COMPLAINT_STATUS.RESOLVED
      ? new Date(createdAt.getTime() + 36 * 3600000)
      : null;

    const complaint = await Complaint.create({
      title: report.title,
      description: report.description,
      category: report.category,
      priority: report.priority,
      location: report.location,
      reportedBy: student._id,
      assignedTo: staff?._id || null,
      status: report.status,
      resolutionRemarks: report.remarks,
      rejectionReason: report.rejectionReason,
      resolvedAt,
      createdAt,
      updatedAt: createdAt,
    });

    await recordActivity({
      complaint,
      actor: student,
      action: 'created',
      message: `${student.name} reported a ${complaint.category} issue`,
      meta: { status: COMPLAINT_STATUS.PENDING, priority: complaint.priority },
    });

    if (staff) {
      await recordActivity({
        complaint,
        actor: admin,
        action: 'assigned',
        message: `${admin.name} assigned this complaint to ${staff.name}`,
        meta: { assignedTo: staff._id },
      });

      const steps = [];
      if (report.status === COMPLAINT_STATUS.IN_PROGRESS) steps.push([COMPLAINT_STATUS.ASSIGNED, COMPLAINT_STATUS.IN_PROGRESS]);
      if (report.status === COMPLAINT_STATUS.RESOLVED) {
        steps.push([COMPLAINT_STATUS.ASSIGNED, COMPLAINT_STATUS.IN_PROGRESS]);
        steps.push([COMPLAINT_STATUS.IN_PROGRESS, COMPLAINT_STATUS.RESOLVED]);
      }

      for (const [from, to] of steps) {
        await recordActivity({
          complaint,
          actor: staff,
          action: 'status_changed',
          message: `${staff.name} moved this complaint from ${from} to ${to}`,
          meta: { from, to, remarks: to === COMPLAINT_STATUS.RESOLVED ? report.remarks : undefined },
        });
      }
    }

    if (report.status === COMPLAINT_STATUS.REJECTED) {
      await recordActivity({
        complaint,
        actor: admin,
        action: 'status_changed',
        message: `${admin.name} moved this complaint from ${COMPLAINT_STATUS.PENDING} to ${COMPLAINT_STATUS.REJECTED}`,
        meta: {
          from: COMPLAINT_STATUS.PENDING,
          to: COMPLAINT_STATUS.REJECTED,
          rejectionReason: report.rejectionReason,
        },
      });
    }

    if (report.status === COMPLAINT_STATUS.IN_PROGRESS) {
      await Comment.create({
        complaint: complaint._id,
        author: staff._id,
        text: 'Inspected the rooftop solar tank today; the controller board is faulty and a spare has been ordered.',
      });
    }

    if (report.rating) {
      await Feedback.create({
        complaint: complaint._id,
        student: student._id,
        rating: report.rating,
        comment: report.rating >= 5 ? 'Fixed the same day I reported it.' : 'Resolved, though it took a few follow-ups.',
      });
    }

    made += 1;
  }

  const [users, complaints, activities, comments, feedback] = await Promise.all([
    User.countDocuments(),
    Complaint.countDocuments(),
    Activity.countDocuments(),
    Comment.countDocuments(),
    Feedback.countDocuments(),
  ]);

  log(
    `[seed] ${made} new complaint(s); totals now -> users ${users}, complaints ${complaints}, ` +
      `activities ${activities}, comments ${comments}, feedback ${feedback}`
  );

  return { made, users, complaints };
}
