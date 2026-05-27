import json
from typing import Tuple, List

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage

from utils import normalize_message_content
from engine import VideoRAGEngine


EVALUATOR_SYSTEM = """You are an independent evaluator for a VideoRAG system.
You have no role in generating or retrying answers — you only score.

You receive:
  USER_QUESTION : the original question
  ANSWER        : the answer produced by the system
  EVIDENCE      : the raw retrieved documents used to generate the answer

Score the answer on two axes out of 10:
  Relevance — how directly and completely the answer addresses the question.
  Grounding — how well the answer's core claims are traceable to the evidence.
              Reasonable general-knowledge elaboration is fine; penalise only
              claims that contradict or have no basis in the evidence.

Reply in EXACTLY this format (3 lines, nothing else):
Relevance: <N>/10 (<3-6 word reason>)
Grounding: <N>/10 (<3-6 word reason>)
Quality: <1-2 sentence overall assessment of the answer>"""


MAX_TOOL_CALLS_PER_TOOL = 3
MAX_DOCS_PER_CALL = 10


def execute_tool_calls(
    engine: VideoRAGEngine,
    ai_message: AIMessage,
    tool_usage_counter: dict,
) -> Tuple[List[ToolMessage], str]:
    tool_msgs = []
    evidence = []

    for tc in ai_message.tool_calls:
        name = tc["name"]
        args = tc.get("args", {})

        if "k" in args:
            args = dict(args)
            args["k"] = min(int(args["k"]), MAX_DOCS_PER_CALL)

        tool_usage_counter[name] = tool_usage_counter.get(name, 0) + 1

        if tool_usage_counter[name] > MAX_TOOL_CALLS_PER_TOOL:
            warn = (
                f"Tool '{name}' has reached its call limit "
                f"({MAX_TOOL_CALLS_PER_TOOL}). Skipping."
            )
            tool_msgs.append(ToolMessage(content=warn, tool_call_id=tc["id"]))
            evidence.append(f"--- {name}({args}) ---\n{warn}")
            engine.retrieved_docs.append({
                "tool": name,
                "args": args,
                "status": "skipped (limit reached)",
                "result": warn,
            })
            continue

        fn = engine.tool_map.get(name)
        if fn is None:
            warn = f"Tool '{name}' is not available."
            tool_msgs.append(ToolMessage(content=warn, tool_call_id=tc["id"]))
            evidence.append(f"--- {name}({args}) ---\n{warn}")
            engine.retrieved_docs.append({
                "tool": name,
                "args": args,
                "status": "error (not found)",
                "result": warn,
            })
            continue

        try:
            result = fn.invoke(args)
            status = "ok"
        except Exception as e:
            result = json.dumps({"error": str(e)})
            status = "error"

        tool_msgs.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))
        evidence.append(f"--- {name}({args}) ---\n{result}")
        engine.retrieved_docs.append({
            "tool": name,
            "args": args,
            "status": status,
            "result": result,
        })

    return tool_msgs, "\n\n".join(evidence)


def evaluate(engine: VideoRAGEngine, question: str, answer: str, evidence: str) -> str:
    msg = (
        f"USER_QUESTION:\n{question}\n\n"
        f"ANSWER:\n{answer}\n\n"
        f"EVIDENCE:\n{evidence[:6000]}"
    )
    resp = engine.evaluator_llm.invoke([
        SystemMessage(content=EVALUATOR_SYSTEM),
        HumanMessage(content=msg),
    ])
    return normalize_message_content(resp.content).strip()


def run_videorag_with_observability(
    engine: VideoRAGEngine,
    question: str,
    verbose: bool = True,
) -> Tuple[str, list[dict], str]:
    engine.retrieved_docs.clear()

    messages: list = [
        SystemMessage(content=engine.orchestrator_system),
        HumanMessage(content=question),
    ]
    all_evidence = ""
    tool_usage_counter: dict = {}

    while True:
        response = engine.orchestrator_llm.invoke(messages)
        messages.append(response)

        if response.tool_calls:
            tool_msgs, chunk = execute_tool_calls(engine, response, tool_usage_counter)
            messages.extend(tool_msgs)
            all_evidence += chunk + "\n"
            if verbose:
                for tc in response.tool_calls:
                    print(f"  [Tool called] {tc['name']}({tc.get('args', {})})")
        else:
            final_answer = normalize_message_content(response.content).strip()
            break

    if not final_answer:
        final_answer = (
            "Timestamp: N/A\n"
            "Answer: This topic is not covered in this video or could not be found."
        )

    scores = evaluate(engine, question, final_answer, all_evidence)

    if verbose:
        print("\n[Evaluator Scores]")
        print(scores)
        print()

    return final_answer, list(engine.retrieved_docs), scores


def run_videorag(engine: VideoRAGEngine, question: str, verbose: bool = True) -> str:
    answer, _, _ = run_videorag_with_observability(engine, question, verbose=verbose)
    return answer
