"use client";

import { useEffect, useState } from "react";

type Message = {
  role: "user" | "assistant";
  text: string;
};

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "DM: Welcome, traveler..." },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // 🎭 TYPEWRITER STATE
  const [displayText, setDisplayText] = useState("");

  const getColor = (name: string) => {
    switch (name.toLowerCase()) {
      case "dm":
        return "#ffd54f";
      case "dungeon master":
        return "#ffd54f";
      case "bob":
        return "#4fc3f7";
      case "npc":
        return "#ff8a65";
      case "player":
        return "#81c784";
      default:
        return "#ffffff";
    }
  };

  // 🧠 TYPEWRITER EFFECT
  useEffect(() => {
    if (!loading && messages.length > 0) {
      const last = messages[messages.length - 1];

      if (last.role === "assistant") {
        let i = 0;
        setDisplayText("");

        const interval = setInterval(() => {
          setDisplayText(last.text.slice(0, i));
          i++;

          if (i > last.text.length) {
            clearInterval(interval);
          }
        }, 15); // speed (lower = faster)

        return () => clearInterval(interval);
      }
    }
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userText = input;
    setInput("");
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", text: userText },
      { role: "assistant", text: "" },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userMessage: userText,
        }),
      });

      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        fullText += decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            text: fullText,
          };
          return copy;
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "DM: Something went wrong..." },
      ]);
    }

    setLoading(false);
  };

  // 🎨 FORMAT RENDERER
  const renderText = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (!line.trim()) return <div key={i} style={{ height: 6 }} />;

      const cleaned = line.replace(/\*\*(.*?)\*\*/g, "$1");

      const match = cleaned.match(/^([A-Za-z ]+):\s*(.*)$/);

      if (match) {
        const name = match[1];
        const content = match[2];

        return (
          <p key={i} style={{ margin: "4px 0" }}>
            <span
              style={{
                color: getColor(name),
                fontWeight: "bold",
              }}
            >
              {name}:
            </span>{" "}
            <span style={{ color: "#fff" }}>{content}</span>
          </p>
        );
      }

      return (
        <p key={i} style={{ margin: "4px 0", color: "#ddd" }}>
          {cleaned}
        </p>
      );
    });
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* CHAT */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent:
                msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                maxWidth: "70%",
                padding: 12,
                borderRadius: 10,
                background:
                  msg.role === "user"
                    ? "#8b5a2b"
                    : "rgba(0,0,0,0.65)",
                color: "white",
                whiteSpace: "pre-wrap",
              }}
            >
              {/* 🔥 TYPEWRITER ONLY FOR LAST MESSAGE */}
              {i === messages.length - 1 && msg.role === "assistant"
                ? renderText(displayText)
                : renderText(msg.text)}
            </div>
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div
        style={{
          display: "flex",
          padding: 10,
          background: "rgba(0,0,0,0.5)",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Speak to the world..."
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 8,
            border: "none",
            outline: "none",
          }}
        />

        <button
          onClick={sendMessage}
          style={{
            marginLeft: 10,
            padding: "10px 16px",
            background: "#2e7d32",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}