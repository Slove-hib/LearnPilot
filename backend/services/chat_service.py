import json
from models.schemas import ChatReplyOut, ChatHistoryOut, MessageOut
from agents.tutor import tutor_agent
from database import get_db


def stream_message(goal_id: int, task_id: int | None, user_message: str, user_id: int):
    """流式发送消息，yield SSE 格式的事件字符串。"""
    db = get_db()

    # 1. Validate goal
    goal_row = db.execute(
        "SELECT * FROM goals WHERE id = ? AND user_id = ?", (goal_id, user_id)
    ).fetchone()
    if not goal_row:
        yield f"data: {json.dumps({'error': 'Goal not found'})}\n\n"
        return

    # 2. Validate task
    task_row = None
    if task_id is not None:
        task_row = db.execute(
            "SELECT * FROM tasks WHERE id = ? AND goal_id = ?", (task_id, goal_id)
        ).fetchone()
        if not task_row:
            yield f"data: {json.dumps({'error': 'Task not found'})}\n\n"
            return

    # 3. Save user message
    db.execute(
        "INSERT INTO messages (goal_id, task_id, role, content) VALUES (?, ?, ?, ?)",
        (goal_id, task_id, "user", user_message),
    )
    db.commit()

    # 4. Build context
    goal_info = {
        "title": goal_row["title"],
        "description": goal_row["description"],
        "skill_level": goal_row["skill_level"],
        "daily_hours": goal_row["daily_hours"],
        "duration_weeks": goal_row["duration_weeks"],
    }

    task_info = None
    if task_row:
        task_info = {
            "title": task_row["title"],
            "description": task_row["description"],
            "task_type": task_row["task_type"],
            "task_date": task_row["task_date"],
            "status": task_row["status"],
        }

    # 5. Get recent history
    history_rows = db.execute(
        "SELECT role, content FROM messages WHERE goal_id = ? ORDER BY created_at DESC LIMIT 20",
        (goal_id,),
    ).fetchall()
    history = [{"role": r["role"], "content": r["content"]} for r in reversed(history_rows)]

    # 6. Stream from agent
    full_reply = []
    try:
        for chunk in tutor_agent.chat_stream(
            goal_info=goal_info,
            task_info=task_info,
            history=history[:-1],
            user_message=user_message,
        ):
            full_reply.append(chunk)
            yield f"data: {json.dumps({'content': chunk})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        return

    # 7. Save assistant message
    reply_text = "".join(full_reply)
    cursor = db.execute(
        "INSERT INTO messages (goal_id, task_id, role, content, agent_type) VALUES (?, ?, ?, ?, ?)",
        (goal_id, task_id, "assistant", reply_text, "tutor"),
    )
    db.commit()
    message_id = cursor.lastrowid

    # 8. Send final message_id
    yield f"data: {json.dumps({'message_id': message_id})}\n\n"
    yield "data: [DONE]\n\n"


def _row_to_message(row) -> MessageOut:
    return MessageOut(**dict(row))


def send_message(goal_id: int, task_id: int | None, user_message: str, user_id: int) -> ChatReplyOut:
    db = get_db()

    # 1. Validate goal exists and belongs to user
    goal_row = db.execute(
        "SELECT * FROM goals WHERE id = ? AND user_id = ?", (goal_id, user_id)
    ).fetchone()
    if not goal_row:
        raise LookupError("Goal not found")

    # 2. Validate task exists (if provided)
    task_row = None
    if task_id is not None:
        task_row = db.execute(
            "SELECT * FROM tasks WHERE id = ? AND goal_id = ?", (task_id, goal_id)
        ).fetchone()
        if not task_row:
            raise LookupError("Task not found")

    # 3. Save user message
    db.execute(
        "INSERT INTO messages (goal_id, task_id, role, content) VALUES (?, ?, ?, ?)",
        (goal_id, task_id, "user", user_message),
    )
    db.commit()

    # 4. Build context for agent
    goal_info = {
        "title": goal_row["title"],
        "description": goal_row["description"],
        "skill_level": goal_row["skill_level"],
        "daily_hours": goal_row["daily_hours"],
        "duration_weeks": goal_row["duration_weeks"],
    }

    task_info = None
    if task_row:
        task_info = {
            "title": task_row["title"],
            "description": task_row["description"],
            "task_type": task_row["task_type"],
            "task_date": task_row["task_date"],
            "status": task_row["status"],
        }

    # 5. Get recent history (last 10 messages)
    history_rows = db.execute(
        "SELECT role, content FROM messages WHERE goal_id = ? ORDER BY created_at DESC LIMIT 20",
        (goal_id,),
    ).fetchall()
    history = [{"role": r["role"], "content": r["content"]} for r in reversed(history_rows)]

    # 6. Call Tutor Agent
    try:
        reply = tutor_agent.chat(
            goal_info=goal_info,
            task_info=task_info,
            history=history[:-1],  # exclude the last user message we just saved
            user_message=user_message,
        )
    except Exception as e:
        raise RuntimeError(f"AI API error: {e}")

    # 7. Save assistant message
    cursor = db.execute(
        "INSERT INTO messages (goal_id, task_id, role, content, agent_type) VALUES (?, ?, ?, ?, ?)",
        (goal_id, task_id, "assistant", reply, "tutor"),
    )
    db.commit()
    message_id = cursor.lastrowid

    return ChatReplyOut(
        goal_id=goal_id,
        task_id=task_id,
        reply=reply,
        message_id=message_id,
    )


def get_history(goal_id: int, limit: int, user_id: int) -> ChatHistoryOut:
    db = get_db()

    # Validate goal exists and belongs to user
    goal_row = db.execute(
        "SELECT id FROM goals WHERE id = ? AND user_id = ?", (goal_id, user_id)
    ).fetchone()
    if not goal_row:
        raise LookupError("Goal not found")

    rows = db.execute(
        "SELECT * FROM messages WHERE goal_id = ? ORDER BY created_at ASC LIMIT ?",
        (goal_id, limit),
    ).fetchall()

    return ChatHistoryOut(
        goal_id=goal_id,
        messages=[_row_to_message(r) for r in rows],
    )
