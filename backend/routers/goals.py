import traceback
from fastapi import APIRouter, HTTPException, Depends
from models.schemas import GoalCreate, GoalOut, GoalWithPlan, AdjustRequest, AdjustmentResultOut
from services.plan_service import create_goal_with_plan, get_all_goals, get_goal_with_plan
from services.adjustment_service import adjust_plan
from auth import get_current_user
from rate_limit import ai_rate_limit_dependency

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.post("", response_model=GoalWithPlan, status_code=201)
def create_goal(req: GoalCreate, current_user: dict = Depends(get_current_user), _rl=Depends(ai_rate_limit_dependency())):
    """创建学习目标，并通过 Planner Agent 生成学习计划。"""
    try:
        result = create_goal_with_plan(req, current_user["id"])
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"AI 返回了无效的响应：{e}")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"生成学习计划失败：{type(e).__name__}: {e}")
    return result


@router.get("", response_model=list[GoalOut])
def list_goals(current_user: dict = Depends(get_current_user)):
    """获取所有学习目标。"""
    return get_all_goals(current_user["id"])


@router.get("/{goal_id}/plan", response_model=GoalWithPlan)
def read_plan(goal_id: int, current_user: dict = Depends(get_current_user)):
    """获取指定目标的完整学习计划。"""
    result = get_goal_with_plan(goal_id, current_user["id"])
    if not result:
        raise HTTPException(status_code=404, detail="目标不存在")
    return result


@router.post("/{goal_id}/plan/adjust", response_model=AdjustmentResultOut)
def adjust_goal_plan(goal_id: int, body: AdjustRequest, current_user: dict = Depends(get_current_user), _rl=Depends(ai_rate_limit_dependency())):
    """根据用户反馈和学习进度调整学习计划。"""
    try:
        return adjust_plan(goal_id, body.feedback, current_user["id"])
    except LookupError:
        raise HTTPException(status_code=404, detail="目标不存在")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"AI 返回了无效的响应：{e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"调整学习计划失败：{e}")
