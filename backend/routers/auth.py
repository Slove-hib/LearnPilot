from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from auth import hash_password, verify_password, create_access_token
from database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    password: str


@router.post("/register")
def register(req: RegisterRequest):
    if len(req.username) < 2:
        raise HTTPException(status_code=422, detail="用户名至少 2 个字符")
    if len(req.password) < 4:
        raise HTTPException(status_code=422, detail="密码至少 4 个字符")

    db = get_db()
    existing = db.execute("SELECT id FROM users WHERE username = ?", (req.username,)).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="用户名已存在")

    hashed = hash_password(req.password)
    cursor = db.execute(
        "INSERT INTO users (username, hashed_password) VALUES (?, ?)",
        (req.username, hashed),
    )
    db.commit()

    return {"id": cursor.lastrowid, "username": req.username}


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends()):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username = ?", (form.username,)).fetchone()
    if not user or not verify_password(form.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = create_access_token(user["username"])
    return {"access_token": token, "token_type": "bearer"}
