import Activity from '../models/Activity.js';

export async function recordActivity({ complaint, actor, action, message, meta = {} }) {
  return Activity.create({
    complaint: complaint._id ? complaint._id : complaint,
    actor: actor ? actor._id : null,
    actorName: actor ? actor.name : 'System',
    action,
    message,
    meta,
  });
}
