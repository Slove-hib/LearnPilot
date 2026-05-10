from agents.base import BaseAgent, _extract_content_from_response

SYSTEM_PROMPT = """你是 LearnPilot 的辅导 Agent —— 你的个人学习助手。始终使用中文回答。

回答结构要求：
1. 先给一句核心结论（一两句话说清楚要点）。
2. 再解释原因或原理。
3. 如果涉及编程，给一个小而精的代码示例，不要堆大段代码。
4. 推荐 1-2 个具体的学习资源（官方文档、经典教程、知名博客等），给出资源名称和简要说明。
5. 最后给一个"下一步练习建议"，帮助用户巩固。

风格要求：
- 回答要清晰分层，但不要过度使用 Markdown 标题（最多用一两个）。
- 保持回答精炼，400 字以内。
- 根据 skill_level 调整解释方式：
  - beginner（初学者）：多用生活类比，少用术语，分步拆解。
  - intermediate（中级）：强调原理和常见踩坑点，简洁直接。
  - advanced（高级）：讨论权衡取舍和边界情况。
- 引导理解，不要直接写出完整答案。
- 如果用户问到超出当前阶段的内容，温和地指出前置知识。
- 推荐的资源必须是真实存在的、广受好评的学习资料。
"""


class TutorAgent(BaseAgent):
    def __init__(self):
        super().__init__(system_prompt=SYSTEM_PROMPT, reasoning_effort="medium")

    def chat(
        self,
        goal_info: dict,
        task_info: dict | None,
        history: list[dict],
        user_message: str,
    ) -> str:
        context_parts = []

        context_parts.append(
            f"## 学习目标\n"
            f"- 标题：{goal_info['title']}\n"
            f"- 描述：{goal_info.get('description', '无')}\n"
            f"- 技能水平：{goal_info['skill_level']}\n"
            f"- 每日可用时间：{goal_info['daily_hours']} 小时\n"
            f"- 计划周期：{goal_info['duration_weeks']} 周"
        )

        if task_info:
            context_parts.append(
                f"\n## 当前任务\n"
                f"- 标题：{task_info['title']}\n"
                f"- 描述：{task_info.get('description', '无')}\n"
                f"- 类型：{task_info['task_type']}\n"
                f"- 日期：{task_info['task_date']}\n"
                f"- 状态：{task_info['status']}"
            )

        messages = []
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        full_message = "\n".join(context_parts) + f"\n\n## 用户问题\n{user_message}"
        messages.append({"role": "user", "content": full_message})

        all_messages = [{"role": "system", "content": self.system_prompt}] + messages

        response = self._call_api(all_messages)
        return _extract_content_from_response(response)

    def chat_stream(
        self,
        goal_info: dict,
        task_info: dict | None,
        history: list[dict],
        user_message: str,
    ):
        """流式返回 AI 回复，逐 chunk yield 内容。"""
        context_parts = []

        context_parts.append(
            f"## 学习目标\n"
            f"- 标题：{goal_info['title']}\n"
            f"- 描述：{goal_info.get('description', '无')}\n"
            f"- 技能水平：{goal_info['skill_level']}\n"
            f"- 每日可用时间：{goal_info['daily_hours']} 小时\n"
            f"- 计划周期：{goal_info['duration_weeks']} 周"
        )

        if task_info:
            context_parts.append(
                f"\n## 当前任务\n"
                f"- 标题：{task_info['title']}\n"
                f"- 描述：{task_info.get('description', '无')}\n"
                f"- 类型：{task_info['task_type']}\n"
                f"- 日期：{task_info['task_date']}\n"
                f"- 状态：{task_info['status']}"
            )

        messages = []
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        full_message = "\n".join(context_parts) + f"\n\n## 用户问题\n{user_message}"
        messages.append({"role": "user", "content": full_message})

        all_messages = [{"role": "system", "content": self.system_prompt}] + messages

        stream = self._call_api(all_messages, stream=True)

        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


tutor_agent = TutorAgent()
