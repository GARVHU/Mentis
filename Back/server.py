import sys
import os
import re

# --- 1. FIX THE IMPORT PATH (The Bridge) ---
# Get the directory where server.py lives
current_dir = os.path.dirname(os.path.abspath(__file__))
# Go up one step ('..') and then down into 'Model'
model_dir = os.path.join(current_dir, '../Model')
# Add this path to Python's "search list"
sys.path.append(model_dir)
# -------------------------------------------

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage

# NOW this import will work because we added the path above
from agent import agent 

# Load secrets (Try to find .env in current folder or root)
load_dotenv()

# 2. Setup the API
app = FastAPI()

# 3. Allow React to talk to Python (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        user_input = request.message
        print(f"📩 Received: {user_input}")

        # Run the Agent
        events = agent.invoke(
            {"messages": [HumanMessage(content=user_input)]},
            {"recursion_limit": 15}
        )

        # Extract the last message
        last_message = events["messages"][-1]
        response_text = last_message.content
        # --- THE CLEANING FILTER ---
        clean_text = re.sub(r'\(function=.*?\)', '', response_text)
        
        clean_text = re.sub(r'\{"query":.*?\}\}', '', clean_text)
        
        final_response = clean_text.strip()
        return {"reply": final_response}

    except Exception as e:
        print(f"❌ Error: {e}")
        # Print detailed error to helps us debug if imports fail
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # 0.0.0.0 allows access from other devices on the network too
    uvicorn.run(app, host="localhost", port=8000)