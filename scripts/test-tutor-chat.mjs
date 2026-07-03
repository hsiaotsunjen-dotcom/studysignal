const base = process.argv[2] ?? "http://127.0.0.1:3001";

async function post(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(path, res.status, text.slice(0, 500));
}

await post("/api/tutor-chat", {
  messages: [
    { role: "system", content: "You are a tutor" },
    { role: "user", content: "Hi" },
  ],
});

await post("/api/tutor-chat", {
  messages: [
    { role: "system", content: "You are a tutor" },
    { role: "assistant", content: "Hello!" },
    {
      role: "user",
      content: [
        { type: "text", text: "Help with homework" },
        {
          type: "image_url",
          image_url: {
            url: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==",
          },
        },
      ],
    },
  ],
});
