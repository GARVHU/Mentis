import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, Menu } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function App() {
  // 1. STATE: Keeps track of the conversation
  const [messages, setMessages] = useState([
    { role: "ai", content: "Hello! I am your Mental Health Assistant. How are you feeling today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Ref for auto-scrolling to the bottom
  const messagesEndRef = useRef(null);

  // 2. AUTO-SCROLL: Runs every time 'messages' changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  // 3. HANDLER: What happens when you press Send
  const handleSend = async () => {
      if (!input.trim()) return;

      // 1. Add User Message to UI immediately
      const userMessage = { role: "user", content: input };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        // 2. Send to Python Backend (The "Brain")
        const response = await fetch("http://localhost:8000/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: input }),
        });

        // 3. Get the answer
        const data = await response.json();

        if (!response.ok) throw new Error("Server Error");

        // 4. Add AI Message to UI
        const aiMessage = { 
          role: "ai", 
          content: data.reply // This comes from your server.py
        };
        setMessages((prev) => [...prev, aiMessage]);

      } catch (error) {
        console.error("Error:", error);
        // Optional: Show an error bubble if it fails
        setMessages((prev) => [
          ...prev, 
          { role: "ai", content: "⚠️ Sorry, I can't reach the server. Is the Python terminal running?" }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
      
      {/* SIDEBAR (Simple version for now) */}
      <div className="hidden md:flex w-64 flex-col border-r border-gray-800 bg-gray-950 p-4">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Mentis AI</h1>
        </div>
        
        <div className="flex-1 space-y-2">
          <button className="w-full text-left px-4 py-3 rounded-lg bg-gray-900 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
            + New Chat
          </button>
          <div className="px-4 py-2 text-xs text-gray-500 uppercase font-semibold mt-4">Recent</div>
          {/* Fake History Items */}
          <div className="px-4 py-2 text-sm text-gray-400 hover:text-white cursor-pointer truncate">
            How to manage anxiety?
          </div>
          <div className="px-4 py-2 text-sm text-gray-400 hover:text-white cursor-pointer truncate">
            Sleep schedule tips
          </div>
        </div>
        
        {/* User Profile at Bottom */}
        <div className="mt-auto border-t border-gray-800 pt-4 px-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center font-bold text-xs">
            GK
          </div>
          <div className="text-sm">
            <div className="font-medium">Gaurav Kadian</div>
            <div className="text-xs text-gray-500">Free Tier</div>
          </div>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* TOP BAR (Mobile only) */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-gray-950">
          <span className="font-bold">Mentis AI</span>
          <Menu className="w-6 h-6 text-gray-400" />
        </div>

        {/* MESSAGES LIST */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* AI Avatar */}
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-700">
                  <Bot className="w-5 h-5 text-blue-400" />
                </div>
              )}

              {/* Message Bubble */}
              <div 
                className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm
                ${msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-bl-none'
                }`}
              >
                {/* USE THE MARKDOWN COMPONENT HERE */}
                <ReactMarkdown 
                  components={{
                    strong: ({node, ...props}) => <span className="font-bold text-blue-300" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc ml-4 mt-2 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal ml-4 mt-2 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>

              {/* User Avatar */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-gray-300" />
                </div>
              )}
            </div>
          ))}

          {/* LOADING INDICATOR */}
          {isLoading && (
            <div className="flex gap-4 justify-start animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                <Bot className="w-5 h-5 text-blue-400" />
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-none px-5 py-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="p-4 bg-gray-900 border-t border-gray-800">
          <div className="max-w-3xl mx-auto relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about anxiety, sleep, or CBT techniques..."
              disabled={isLoading}
              className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl pl-5 pr-12 py-4 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:bg-gray-700 disabled:text-gray-500"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">
            Mentis AI can make mistakes. Consider checking important information.
          </p>
        </div>

      </div>
    </div>
  );
}