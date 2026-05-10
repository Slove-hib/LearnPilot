from fastapi import APIRouter, HTTPException, Query, Depends
from models.schemas import TaskOut, TaskUpdate, TodayTasksOut
from services.task_service import get_today_tasks, get_tasks, update_task
from auth import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

VALID_STATUSES = {"pending", "in_progress", "done"}


@router.get("/today", response_model=TodayTasksOut)
def today_tasks(current_user: dict = Depends(get_current_user)):
    """获取今日所有任务。"""
    return get_today_tasks(current_user["id"])


@router.get("", response_model=list[TaskOut])
def list_tasks(
    goal_id: int | None = Query(None),
    date: str | None = Query(None, alias="date"),
    current_user: dict = Depends(get_current_user),
):
    """查询任务列表，可按目标 ID 和/或日期筛选。"""
    return get_tasks(current_user["id"], goal_id=goal_id, task_date=date)


@router.patch("/{task_id}", response_model=TaskOut)
def patch_task(task_id: int, body: TaskUpdate, current_user: dict = Depends(get_current_user)):
    """更新任务状态。"""
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"无效的状态 '{body.status}'，必须是以下之一：{VALID_STATUSES}",
        )
    try:
        return update_task(task_id, body.status, current_user["id"])
    except LookupError:
        raise HTTPException(status_code=404, detail="任务不存在")
