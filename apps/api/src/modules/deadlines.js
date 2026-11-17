// In-app escalation only: never changes assignee, approval or sends external messages.
export async function notifyOverdue(repo) {
  const [tasks] = await repo.pool.query(
    "SELECT t.id FROM workflow_tasks t JOIN workflow_instances i ON i.id=t.instance_id JOIN users u ON u.id=t.assignee_id AND u.status='active' WHERE t.state='pending' AND i.state='in_review' AND t.due_at<=CURRENT_TIMESTAMP(6) LIMIT 100",
  );
  let emitted = 0;
  for (const candidate of tasks)
    await repo.transaction(async (c) => {
      const [r] = await c.execute(
        "SELECT t.*,i.document_id,i.started_by FROM workflow_tasks t JOIN workflow_instances i ON i.id=t.instance_id WHERE t.id=? AND t.state='pending' AND i.state='in_review' AND t.due_at<=CURRENT_TIMESTAMP(6) FOR UPDATE",
        [candidate.id],
      );
      if (!r.length) return;
      const t = r[0],
        event = "workflow.overdue." + t.id.slice(0, 18);
      const [sent] = await c.execute(
        "SELECT id FROM notifications WHERE user_id=? AND document_id=? AND event_type=?",
        [t.assignee_id, t.document_id, event],
      );
      if (sent.length) return;
      for (const recipient of new Set([t.assignee_id, t.started_by]))
        await c.execute(
          "INSERT INTO notifications(id,user_id,event_type,document_id) VALUES (UUID(),?,?,?)",
          [recipient, event, t.document_id],
        );
      await repo.audit(c, null, "workflow.overdue-notified", t.id);
      emitted++;
    });
  return { emitted };
}
