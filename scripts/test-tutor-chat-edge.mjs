const base = process.argv[2] ?? "http://127.0.0.1:3001";

async function post(label, body) {
  try {
    const res = await fetch(`${base}/api/tutor-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log(label, res.status, text.slice(0, 300));
  } catch (e) {
    console.log(label, "FETCH_ERR", e);
  }
}

// Simulate buildTutorChatOpenAIMessages + vision (image-only CHAT path)
const system =
  "You are StudySignal, a friendly AI English tutor in **tutor conversation mode**...";
const modelUserText =
  "The student sent 1 image(s) with no additional typed text. Read the image(s), infer the homework question or problem, help them in English, and ask what they want to do next.";

await post("vision-only", {
  messages: [
    { role: "system", content: system },
    {
      role: "assistant",
      content:
        "嗨，我是 StudySignal 的 AI 家教。\n\n【英文對話】直接用麥克風說英文，跟我練習口說。\n【課業輔導】直接打字或上傳題目圖片，我會一步一步陪你解題。",
    },
    {
      role: "user",
      content: [
        { type: "text", text: modelUserText },
        {
          type: "image_url",
          image_url: {
            url: "data:image/jpeg;base64,INVALID!!!",
          },
        },
      ],
    },
  ],
});

// Empty messages array edge
await post("empty-messages", { messages: [] });

// Single message
await post("one-message", {
  messages: [{ role: "system", content: "x" }],
});

// Assistant with array content (invalid)
await post("assistant-array", {
  messages: [
    { role: "system", content: "x" },
    { role: "assistant", content: [{ type: "text", text: "bad" }] },
    { role: "user", content: "hi" },
  ],
});
