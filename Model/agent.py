import os
from dotenv import load_dotenv

# --- LLM (GROQ) ---
from langchain_groq import ChatGroq

# --- LangChain / LangGraph ---
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, MessagesState
from langgraph.prebuilt import ToolNode, tools_condition

# --- VECTOR DB (Chroma) ---
import chromadb
from chromadb.utils import embedding_functions


# 1. Load Secrets
load_dotenv()
if not os.environ.get("GROQ_API_KEY"):
    print("❌ Error: No GROQ_API_KEY found in .env")
    exit()


# 2. Setup Vector Database
print("🧠 Connecting to Long-Term Memory...")

# --- PATH FIX ---
# Get the folder where THIS file (agent.py) lives
agent_dir = os.path.dirname(os.path.abspath(__file__))
# Force the DB path to always be inside 'Model/my_vector_db'
db_path = os.path.join(agent_dir, "my_vector_db")
# ----------------

client = chromadb.PersistentClient(path=db_path) # <--- Use the fixed path here

embedding_func = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)
collection = client.get_collection(
    name="my_documents", embedding_function=embedding_func
)
print("✅ Connected to DataBase.")

# 3. Define the Retrieval Tool
@tool
def consult_cbt_manual(query: str):
    """
    Use this tool to look up information in the database .
    Input: A specific search phrase.
    """
    print(f"   🔎 SEARCHING DATABASE FOR: '{query}'...")
    results = collection.query(query_texts=[query], n_results=3)

    if results["documents"]:
        knowledge_list = []
        for i in range(len(results["documents"][0])):
            chunk_text = results["documents"][0][i]
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            source = meta.get("source", "Unknown Source")
            knowledge_list.append(f"[SOURCE: {source}]\n{chunk_text}")

        knowledge = "\n\n".join(knowledge_list)
        return f"FOUND IN DATABASE:\n{knowledge}"
    else:
        return "No relevant information found."


# 4. Setup the LLM (GROQ instead of Google)
llm = ChatGroq(
    model="llama-3.1-8b-instant",
    groq_api_key=os.environ["GROQ_API_KEY"]
)

tools = [consult_cbt_manual]
llm_with_tools = llm.bind_tools(tools)


# 5. Build the Graph
def reasoner(state: MessagesState):
    # SYSTEM PROMPT
    system_message = SystemMessage(content="""
    You are a dual-mode AI: A CBT Researcher and a Casual Companion.
    
    PRIORITY RULES (Follow in order):

    1. THERAPIST MODE (High Priority):
       - IF the user mentions a negative emotion or mental health issue (sad, anxious, stress, sleep, panic, depressed), YOU MUST USE 'consult_cbt_manual'.
       - Search FIRST, then answer based on the manual.

    2. CASUAL MODE (Low Priority):
       - IF the user talks about normal life (weather, food, movies, general chat) and is NOT asking for help:
       - DO NOT SEARCH.
       - Just reply naturally and warmly like a friend and do not ask any further question related to user's normal message.
       - Example: If user says "Weather is nice", reply "That sounds lovely! Sunshine always helps the mood."
    """)
    
    # Add system message to the start of history
    messages = [system_message] + state["messages"]
    
    return {"messages": [llm_with_tools.invoke(messages)]}

builder = StateGraph(MessagesState)
builder.add_node("reasoner", reasoner)
builder.add_node("tools", ToolNode(tools))

builder.add_edge("__start__", "reasoner")
builder.add_conditional_edges("reasoner", tools_condition)
builder.add_edge("tools", "reasoner")


# 6. Runtime Loop
print("\n🤖 CBT Agent Online (Groq Powered). Ask me about: Anxiety, Sleep, ABC Model, or Worry Diary.")
print("(Type 'quit' to exit)")


agent = builder.compile()

if __name__ == "__main__":
    print("\n🤖 CBT Agent Online (Groq Powered). Ask me about: Anxiety, Sleep, ABC Model, or Worry Diary.")
    print("(Type 'quit' to exit)")

    system_prompt = SystemMessage(
        content="""
    You are a CBT Therapist Assistant. You answer questions using ONLY the 'consult_cbt_manual' tool.
    
    RULES:
    1. Be concise: Answer in 2–3 sentences.
    2. If the tool returns "No relevant information", say: "I couldn't find that topic."
    3. Source: Base your answer ONLY on the text returned by the tool.
    """
    )

    memory = [system_prompt]

    while True:
        user_input = input("\nUser: ")
        if user_input.lower() in ["quit", "exit"]:
            break

        memory.append(HumanMessage(content=user_input))
        trimmed_memory = [system_prompt] + memory[-6:]

        events = agent.stream(
            {"messages": trimmed_memory},
            stream_mode="values",
            recursion_limit=4,
        )

        for event in events:
            memory = event["messages"]
            last_msg = memory[-1]

            if isinstance(last_msg, dict): continue
            if last_msg.type == "ai" and last_msg.content:
                print(f"Agent: {last_msg.content}")
