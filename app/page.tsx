"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  text: string;
};

const CLASSES = [
  { name: "Warrior", emoji: "⚔️", desc: "Strength & armor" },
  { name: "Mage", emoji: "🔮", desc: "Spells & arcane power" },
  { name: "Rogue", emoji: "🗡️", desc: "Stealth & cunning" },
  { name: "Ranger", emoji: "🏹", desc: "Arrows & survival" },
  { name: "Cleric", emoji: "✨", desc: "Healing & holy magic" },
  { name: "Necromancer", emoji: "💀", desc: "Dark arts & undead" },
];

const ALL_LOCATIONS = [
  { name: "Dark Forest", emoji: "🌲" },
  { name: "Ancient Ruins", emoji: "🏛️" },
  { name: "Cursed Village", emoji: "🏚️" },
  { name: "Forgotten Dungeon", emoji: "🕳️" },
  { name: "Haunted Docks", emoji: "⚓" },
  { name: "Mountain Pass", emoji: "⛰️" },
  { name: "Sunken Temple", emoji: "🌊" },
  { name: "Burning Wasteland", emoji: "🔥" },
  { name: "Shadow Citadel", emoji: "🏰" },
  { name: "Misty Swamp", emoji: "🌫️" },
  { name: "Frozen Tundra", emoji: "❄️" },
  { name: "Goblin Market", emoji: "🪙" },
  { name: "Cursed Graveyard", emoji: "⚰️" },
  { name: "Volcanic Caves", emoji: "🌋" },
  { name: "Enchanted Library", emoji: "📚" },
  { name: "Pirate Cove", emoji: "🏴‍☠️" },
];

const getRandomLocations = () => {
  const shuffled = [...ALL_LOCATIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 6);
};

export default function Page() {
  const [phase, setPhase] = useState<"name" | "power" | "class" | "location" | "chat">("name");
  const [playerName, setPlayerName] = useState("");
  const [playerPower, setPlayerPower] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [powerInput, setPowerInput] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [startingLocations] = useState(() => getRandomLocations());

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const typewriterIndexRef = useRef<number>(-1);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const colorCache = useRef<Record<string, string>>({});

  const getColor = (name: string) => {
    const key = name.toLowerCase();
    switch (key) {
      case "dm": return "#ffd54f";
      case "dungeon master": return "#ffd54f";
      case "player": return "#81c784";
    }
    if (!colorCache.current[key]) {
      const colors = [
        "#4fc3f7", "#ff8a65", "#ce93d8", "#80cbc4",
        "#f48fb1", "#a5d6a7", "#ffcc80", "#90caf9",
        "#ef9a9a", "#b39ddb",
      ];
      const index = Math.abs(
        key.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
      ) % colors.length;
      colorCache.current[key] = colors[index];
    }
    return colorCache.current[key];
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, displayText]);

  useEffect(() => {
    if (messages.length === 0) return;
    const lastIndex = messages.length - 1;
    const last = messages[lastIndex];
    if (last.role !== "assistant") return;
    if (last.text === "") return;
    if (typewriterIndexRef.current === lastIndex) return;
    typewriterIndexRef.current = lastIndex;
    let i = 0;
    setDisplayText("");
    const interval = setInterval(() => {
      i++;
      setDisplayText(last.text.slice(0, i));
      if (i >= last.text.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, [messages]);

  const handleNameSubmit = () => {
    if (!nameInput.trim()) return;
    setPlayerName(nameInput.trim());
    setPhase("power");
  };

  const handlePowerSubmit = () => {
    if (!powerInput.trim()) return;
    setPlayerPower(powerInput.trim());
    setPhase("class");
  };

  const handleClassSelect = (cls: string) => {
    setSelectedClass(cls);
    setPhase("location");
  };

  const handleLocationSelect = async (location: string) => {
    setPhase("chat");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: `START_ADVENTURE: The player ${playerName} the ${selectedClass} with the power of ${playerPower} has chosen to begin at ${location}. Give a unique dramatic welcome and set the scene in one sentence. Never repeat the same opening twice.`,
          playerName,
          playerPower,
          playerClass: selectedClass,
        }),
      });
      const data = await res.json();
      setMessages([{ role: "assistant", text: data.text || "DM: Your adventure begins..." }]);
    } catch {
      setMessages([{ role: "assistant", text: "DM: Your adventure begins..." }]);
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input;
    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: userText,
          playerName,
          playerPower,
          playerClass: selectedClass,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.text || "DM: No response received." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "DM: Something went wrong..." },
      ]);
    }
    setLoading(false);
  };

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
            <span style={{ color: getColor(name), fontWeight: "bold" }}>{name}:</span>{" "}
            <span style={{ color: "#fff" }}>{content}</span>
          </p>
        );
      }
      return <p key={i} style={{ margin: "4px 0", color: "#ddd" }}>{cleaned}</p>;
    });
  };

  const cardStyle = {
    background: "rgba(0,0,0,0.7)",
    borderRadius: 16,
    padding: "32px 24px",
    maxWidth: 400,
    width: "100%",
    textAlign: "center" as const,
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: "none",
    outline: "none",
    marginBottom: 12,
    fontSize: 16,
  };

  const continueBtn = {
    width: "100%",
    padding: "12px",
    background: "#2e7d32",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    cursor: "pointer",
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <style>{`
        * { scrollbar-width: none; box-sizing: border-box; }
        *::-webkit-scrollbar { display: none; }
        body { margin: 0; padding: 0; }
        html, body { overflow: hidden; position: fixed; width: 100%; height: 100%; }
        input { font-size: 16px !important; }
        .class-btn {
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.15);
          color: white;
          border-radius: 12px;
          padding: 14px 10px;
          cursor: pointer;
          transition: background 0.2s, border 0.2s;
          text-align: center;
        }
        .class-btn:hover { background: rgba(255,255,255,0.15); border-color: #ffd54f; }
        .loc-btn {
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.15);
          color: white;
          border-radius: 12px;
          padding: 14px 10px;
          cursor: pointer;
          transition: background 0.2s, border 0.2s;
          text-align: center;
        }
        .loc-btn:hover { background: rgba(255,255,255,0.15); border-color: #4fc3f7; }
        @media (max-width: 600px) {
          .chat-bubble { max-width: 90% !important; font-size: 14px !important; }
          .input-bar { padding: 8px !important; }
          .send-btn { padding: 10px 12px !important; font-size: 14px !important; }
        }
      `}</style>

      {/* NAME */}
      {phase === "name" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={cardStyle}>
            <p style={{ color: "#ffd54f", fontSize: 22, fontWeight: "bold", margin: "0 0 8px" }}>⚔️ Welcome, Traveler</p>
            <p style={{ color: "#ddd", marginBottom: 20, fontSize: 15 }}>Before your journey begins... what is your name?</p>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
              placeholder="Enter your name..."
              style={inputStyle}
            />
            <button onClick={handleNameSubmit} style={continueBtn}>Continue →</button>
          </div>
        </div>
      )}

      {/* POWER */}
      {phase === "power" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={cardStyle}>
            <p style={{ color: "#ffd54f", fontSize: 22, fontWeight: "bold", margin: "0 0 8px" }}>🔥 Well met, {playerName}!</p>
            <p style={{ color: "#ddd", marginBottom: 20, fontSize: 15 }}>Every hero carries a gift within them. What is your power?</p>
            <input
              value={powerInput}
              onChange={(e) => setPowerInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePowerSubmit()}
              placeholder="e.g. fire control, mind reading..."
              style={inputStyle}
            />
            <button onClick={handlePowerSubmit} style={continueBtn}>Continue →</button>
          </div>
        </div>
      )}

      {/* CLASS */}
      {phase === "class" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}>
          <div style={{ ...cardStyle, maxWidth: 460 }}>
            <p style={{ color: "#ffd54f", fontSize: 20, fontWeight: "bold", margin: "0 0 4px" }}>✨ Great, {playerName}!</p>
            <p style={{ color: "#ddd", marginBottom: 20, fontSize: 15 }}>Now it is time to choose your class...</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {CLASSES.map((cls) => (
                <button key={cls.name} className="class-btn" onClick={() => handleClassSelect(cls.name)}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{cls.emoji}</div>
                  <div style={{ fontWeight: "bold", fontSize: 15 }}>{cls.name}</div>
                  <div style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>{cls.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LOCATION */}
      {phase === "location" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}>
          <div style={{ ...cardStyle, maxWidth: 460 }}>
            <p style={{ color: "#4fc3f7", fontSize: 20, fontWeight: "bold", margin: "0 0 4px" }}>🗺️ Where does your story begin?</p>
            <p style={{ color: "#ddd", marginBottom: 20, fontSize: 15 }}>Choose your starting location, {playerName}...</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {startingLocations.map((loc) => (
                <button key={loc.name} className="loc-btn" onClick={() => handleLocationSelect(loc.name)}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{loc.emoji}</div>
                  <div style={{ fontWeight: "bold", fontSize: 14 }}>{loc.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CHAT */}
      {phase === "chat" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {loading && messages.length === 0 && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(0,0,0,0.65)", color: "#aaa", fontStyle: "italic" }}>
                  DM is setting the scene...
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}
              >
                <div
                  className="chat-bubble"
                  style={{
                    maxWidth: "70%",
                    padding: 12,
                    borderRadius: 10,
                    background: msg.role === "user" ? "#8b5a2b" : "rgba(0,0,0,0.65)",
                    color: "white",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {i === messages.length - 1 && msg.role === "assistant"
                    ? renderText(displayText)
                    : renderText(msg.text)}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div
            className="input-bar"
            style={{
              display: "flex",
              padding: 10,
              background: "rgba(0,0,0,0.5)",
              paddingBottom: "env(safe-area-inset-bottom, 10px)",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Speak to the world..."
              style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", outline: "none", fontSize: 16 }}
            />
            <button
              className="send-btn"
              onClick={sendMessage}
              style={{ marginLeft: 10, padding: "10px 16px", background: "#2e7d32", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}