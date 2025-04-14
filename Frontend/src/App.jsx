import { useState } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-dark.css";
import axios from "axios";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function App() {
  const [code, setCode] = useState("");
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);

  async function reviewCode() {
    setLoading(true);
    setReview("⏳ Waiting for response...");

    try {
      const response = await axios.post(
        "https://code-reviewer-57sc.onrender.com/ai/get-review",
        { code }
      );
      setReview(response.data);
    } catch (error) {
      setReview("Error: Unable to fetch the review. Please try again.");
    }

    setLoading(false);
  }

  return (
    <main className="w-full h-screen bg-zinc-800 flex flex-col items-center p-4">
      <div className="w-full flex justify-center items-center px-6">
        <h1 className="text-white text-4xl font-extrabold pb-6 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text shadow-lg">
          CodeSense
        </h1>
      </div>

      <div className="w-full max-w-[1480px] flex flex-col md:flex-row gap-4 h-[80vh]">
        <div className="relative md:w-1/2 w-full h-full bg-black rounded-xl border-2 border-white p-4 flex flex-col">
          <div className="relative code text-white font-mono overflow-hidden rounded-lg h-auto">
            {!code && (
              <div className="absolute text-sm md:text-md top-4 left-4 text-gray-500 pointer-events-none z-10">
                ✍️ Start typing your code here...
              </div>
            )}
            <Editor
              value={code}
              onValueChange={setCode}
              padding={16}
              highlight={(code) =>
                Prism.highlight(
                  code,
                  Prism.languages.javascript || Prism.languages.markup,
                  "javascript"
                )
              }
              textareaId="code-editor"
              textareaClassName="editor-textarea"
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
              }}
            />
          </div>

          <button
            onClick={reviewCode}
            disabled={loading}
            className={`absolute bottom-4 right-4 rounded-md px-5 font-bold text-white py-2 transition-all ${
              loading ? "bg-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Reviewing..." : "Review"}
          </button>
        </div>

        <div className="md:w-1/2 w-full h-full border-2 border-white bg-zinc-900 rounded-xl p-4 flex flex-col">
          <div className="code text-white font-[General_Sans] flex-1 overflow-auto p-3 rounded-lg shadow-md">
            <Markdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={atomDark}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {review}
            </Markdown>
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;