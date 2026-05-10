from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
from models.schemas import ChatRequest, ChatReplyOut, ChatHistoryOut
from services.chat_service import send_message, stream_message, get_history
from auth import get_current_user
from rate_limit import ai_rate_limit_dependency

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatReplyOut)
def chat(req: ChatRequest, current_user: dict = Depends(get_current_user), _rl=Depends(ai_rate_limit_dependency())):
    """发送学习问题，获取 AI 辅导回答。"""
    try:
        return send_message(req.goal_id, req.task_id, req.message, current_user["id"])
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"未知错误：{e}")


@router.post("/stream")
def chat_stream(req: ChatRequest, current_user: dict = Depends(get_current_user), _rl=Depends(ai_rate_limit_dependency())):
    """流式发送学习问题，返回 SSE 事件流。"""
    return StreamingResponse(
        stream_message(req.goal_id, req.task_id, req.message, current_user["id"]),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history", response_model=ChatHistoryOut)
def chat_history(
    goal_id: int = Query(...),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """获取指定学习目标的对话历史。"""
    try:
        return get_history(goal_id, limit, current_user["id"])
    except LookupError:
        raise HTTPException(status_code=404, detail="目标不存在")
