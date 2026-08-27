import base64
import mimetypes
import os
import time

import requests

API_KEY = "sk-HnnMzpdan4aPKf3cXt43UYZmwGUJ2crn1IEHmVgOllsoPUmt"
BASE_URL = "https://botcf.com/v1"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

image_path = "reference.jpg"
mime = mimetypes.guess_type(image_path)[0] or "image/jpeg"
with open(image_path, "rb") as image_file:
    image_data = base64.b64encode(image_file.read()).decode("ascii")

create_response = requests.post(
    f"{BASE_URL}/videos",
    headers={**HEADERS, "Content-Type": "application/json"},
    json={
        "model": "seedance2.5",
        # 文本提示词
        "prompt": "保持参考图主体一致，人物缓慢抬头看向远方，电影感自然光，镜头平稳",
        # 图片输入：参考图，必须放在images数组中
        "images": [f"data:{mime};base64,{image_data}"],
        # 视频时长：10秒
        "seconds": "10",
        # 视频尺寸：1280x720
        "size": "1280x720",
        # 视频分辨率：720p
        "resolution_name": "720p",
        # 视频预设：normal
        "preset": "normal",
    },
    timeout=120,
)
create_response.raise_for_status()
task_id = create_response.json()["id"]
print("任务已创建：", task_id)

while True:
    response = requests.get(
        f"{BASE_URL}/videos/{task_id}",
        headers=HEADERS,
        timeout=30,
    )
    response.raise_for_status()
    task = response.json()
    status = task.get("status")
    print(f"状态：{status}，进度：{task.get('progress', 0)}%")

    if status == "completed":
        break
    if status in {"failed", "cancelled", "expired"}:
        error = task.get("error") or {}
        raise RuntimeError(error.get("message", "视频生成失败"))
    time.sleep(15)

with requests.get(
    f"{BASE_URL}/videos/{task_id}/content",
    headers=HEADERS,
    stream=True,
    timeout=300,
) as video_response:
    video_response.raise_for_status()
    with open("seedance2.5.mp4", "wb") as output:
        for chunk in video_response.iter_content(1024 * 1024):
            if chunk:
                output.write(chunk)

print("视频已保存：seedance2.5.mp4")