import { useState } from "react";

function App() {
  const [code, setCode] = useState("");

  return (
    <textarea
      value={code}
      onChange={(e) => setCode(e.target.value)}
      style={{
        backgroundColor: "#1E1E1E",
        fontSize: 16,
        width: "100%",
        height: "100%",
        color: "#D4D4D4",
        borderRadius: "8px",
        fontFamily: "'Fira Code', monospace",
        overflowY: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        padding: "16px",
      }}
    />
  );
}

export default App;