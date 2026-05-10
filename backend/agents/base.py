from openai import OpenAI
import json
import re
import time
import logging
import sys
from config import MIMO_API_KEY, MIMO_MODEL, MIMO_BASE_URL

logger = logging.getLogger("agents")
logger.setLevel(logging.DEBUG)

if not logger.handlers:
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter(
        "[%(asctime)s] %(name)s %(levelname)s: %(message)s",
        datefmt="%H:%M:%S",
    ))
    logger.addHandler(handler)


def _extract_content_from_response(response) -> str:
    """安全地从 OpenAI 兼容响应中提取 message.content。"""
    logger.debug("RAW RESPONSE: %s", str(response)[:500])

    if not response.choices:
        raise ValueError(
            f"MiMo API 返回的 choices 为空。response 预览：{str(response)[:500]}"
        )

    choice = response.choices[0]
    message = getattr(choice, "message", None)
    if message is None:
        raise ValueError(
            f"MiMo API 返回的 choice 中没有 message 字段。choice 预览：{str(choice)[:500]}"
        )

    content = message.content
    reasoning = getattr(message, "reasoning_content", None)

    # content 为空时，尝试从 reasoning_content 中提取（推理模型常见）
    if not content or not content.strip():
        if reasoning and reasoning.strip():
            logger.debug("content 为空, 使用 reasoning_content")
            content = reasoning
        elif content is None:
            raise ValueError(
                f"MiMo API 返回的 message.content 为 None。\n"
                f"message 完整内容：{str(message)[:1000]}"
            )

    # content 可能是 list（多段内容）
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                parts.append(item.get("text", ""))
            elif hasattr(item, "text"):
                parts.append(item.text)
            else:
                parts.append(str(item))
        content = "\n".join(parts)

    if not isinstance(content, str):
        content = str(content)

    if not content.strip():
        raise ValueError(
            f"MiMo API 返回的 content 为空字符串。\n"
            f"原始 content：{repr(content)}\n"
            f"完整 message：{str(message)[:1000]}"
        )

    logger.debug("CONTENT (final): %s", content[:200])
    return content


def extract_json_from_text(text: str) -> dict:
    """从模型返回的文本中提取并解析 JSON。"""
    if not text or not text.strip():
        raise ValueError("AI response content is empty.")

    raw_content = text
    text = text.strip()

    # 1. 提取 ```json ... ``` 代码块
    code_block = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if code_block:
        text = code_block.group(1).strip()

    # 2. 提取第一个 { 到最后一个 } 之间的内容
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        text = text[first_brace : last_brace + 1]

    # 3. 去掉单行注释 // ...
    text = re.sub(r"//[^\n]*", "", text)

    # 4. 去掉尾随逗号（, 后面紧跟 } 或 ]）
    text = re.sub(r",\s*([}\]])", r"\1", text)

    # 5. 解析
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        preview = raw_content[:1000]
        raise ValueError(
            f"JSON 解析失败：{e}\n"
            f"模型原始返回（前 1000 字符）：\n{preview}"
        ) from e


class BaseAgent:
    MAX_RETRIES = 3
    RETRY_DELAY = 2  # seconds, exponential backoff multiplier

    def __init__(self, system_prompt: str, reasoning_effort: str = "medium"):
        self.client = OpenAI(api_key=MIMO_API_KEY, base_url=MIMO_BASE_URL)
        self.model = MIMO_MODEL
        self.system_prompt = system_prompt
        self.reasoning_effort = reasoning_effort

    def _call_api(self, messages: list[dict], stream: bool = False):
        """Call API with retry logic for transient errors."""
        last_error = None
        for attempt in range(self.MAX_RETRIES):
            try:
                return self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    extra_body={"reasoning_effort": self.reasoning_effort},
                    stream=stream,
                )
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                # Only retry on transient errors
                is_transient = any(kw in error_str for kw in [
                    "timeout", "connection", "rate limit", "429", "500", "502", "503",
                ])
                if not is_transient or attempt == self.MAX_RETRIES - 1:
                    logger.error("API call failed (attempt %d/%d): %s", attempt + 1, self.MAX_RETRIES, e)
                    raise

                delay = self.RETRY_DELAY * (2 ** attempt)
                logger.warning("API call failed (attempt %d/%d), retrying in %ds: %s", attempt + 1, self.MAX_RETRIES, delay, e)
                time.sleep(delay)

        raise last_error

    def chat(self, user_message: str) -> str:
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_message},
        ]
        logger.info("chat() called, model=%s, effort=%s", self.model, self.reasoning_effort)
        response = self._call_api(messages)
        return _extract_content_from_response(response)

    def chat_json(self, user_message: str) -> dict:
        raw = self.chat(user_message)
        return extract_json_from_text(raw)
