import base64
import mimetypes
import os
import time
from pathlib import Path

import requests

API_KEY = "sk-HnnMzpdan4aPKf3cXt43UYZmwGUJ2crn1IEHmVgOllsoPUmt"
BASE_URL = "https://botcf.com/v1"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

# 参考图路径
REFERENCE_IMAGE = Path(__file__).parent / "reference" / "character_full.png"
OUTPUT_FILE = Path(__file__).parent / "assets" / "animations" / "idle.mp4"

# 待机动画提示词
PROMPT = """
基于参考图角色，生成待机状态的循环动画。

场景：角色趴在桌子上，头枕在胳膊上，侧着枕，面向观众。

动作要求：
1. 全程保持微笑表情
2. 自然眨眼（1-2次）
3. 轻微的呼吸起伏
4. 头发和衣服有微小的自然飘动
5. 整体姿势保持放松、可爱的待机状态
6. 动画循环自然，首尾能无缝衔接

风格：二次元动漫风格，流畅自然，适合循环播放。
""".strip()

def generate_idle_animation():
    print("正在生成待机动画...")

    # 读取参考图
    mime = mimetypes.guess_type(str(REFERENCE_IMAGE))[0] or "image/png"
    with open(REFERENCE_IMAGE, "rb") as image_file:
        image_data = base64.b64encode(image_file.read()).decode("ascii")

    # 创建视频生成任务
    create_response = requests.post(
        f"{BASE_URL}/videos",
        headers={**HEADERS, "Content-Type": "application/json"},
        json={
            "model": "seedance2.5",
            "prompt": PROMPT,
            "images": [f"data:{mime};base64,{image_data}"],
            "seconds": "4",
            "size": "1280x720",
            "resolution_name": "720p",
            "preset": "normal",
        },
        timeout=120,
    )
    create_response.raise_for_status()
    task_id = create_response.json()["id"]
    print(f"任务已创建：{task_id}")

    # 轮询任务状态
    while True:
        response = requests.get(
            f"{BASE_URL}/videos/{task_id}",
            headers=HEADERS,
            timeout=30,
        )
        response.raise_for_status()
        task = response.json()
        status = task.get("status")
        progress = task.get("progress", 0)
        print(f"状态：{status}，进度：{progress}%")

        if status == "completed":
            break
        if status in {"failed", "cancelled", "expired"}:
            error = task.get("error") or {}
            raise RuntimeError(error.get("message", "视频生成失败"))
        time.sleep(15)

    # 下载视频
    print("正在下载视频...")
    with requests.get(
        f"{BASE_URL}/videos/{task_id}/content",
        headers=HEADERS,
        stream=True,
        timeout=300,
    ) as video_response:
        video_response.raise_for_status()
        OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_FILE, "wb") as output:
            for chunk in video_response.iter_content(1024 * 1024):
                if chunk:
                    output.write(chunk)

    print(f"待机动画已保存：{OUTPUT_FILE}")

if __name__ == "__main__":
    generate_idle_animation()
