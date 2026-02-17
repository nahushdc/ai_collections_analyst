import json
from typing import Optional

from openai import OpenAI

from backend.config import settings


_client: Optional[OpenAI] = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def query_llm(user_query: str, system_prompt: str) -> str:
    """Single-call LLM query (used by the direct one-shot flow)."""
    client = _get_client()
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query},
        ],
        temperature=0,
        max_tokens=10000,
    )
    return response.choices[0].message.content.strip()


def _clean_json_response(response_text: str) -> str:
    """Remove markdown fences from LLM JSON responses."""
    if response_text.startswith('```'):
        response_text = response_text.split('```')[1]
        if response_text.startswith('json'):
            response_text = response_text[4:]
        response_text = response_text.strip()
    return response_text


def parse_query(user_query: str, system_prompt: str) -> dict:
    """
    FIRST LLM call: Parse natural language query into preview structure.
    Returns JSON with output columns, logic, and row labels.
    """
    client = _get_client()

    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query},
        ],
        temperature=0,
        max_tokens=2000,
    )

    response_text = response.choices[0].message.content.strip()
    response_text = _clean_json_response(response_text)

    try:
        return json.loads(response_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse LLM response as JSON: {e}\nResponse: {response_text}")


def generate_code(user_query: str, system_prompt: str) -> dict:
    """
    SECOND LLM call: Generate pandas code and SQL from confirmed logic.
    Returns dict with 'python' and 'sql' keys.
    """
    client = _get_client()

    enhanced_prompt = system_prompt + """

## Output Format:
Return your response in this exact format with both Python and SQL:

PYTHON:
```python
<your pandas code here>
```

SQL:
```sql
<equivalent SQL query here>
```

The SQL should be a standard SELECT query that would produce the same result.
Assume the table is named 'loans' with the same column names as the DataFrame."""

    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": enhanced_prompt},
            {"role": "user", "content": user_query},
        ],
        temperature=0,
        max_tokens=10000,
    )

    response_text = response.choices[0].message.content.strip()

    result = {'python': '', 'sql': ''}

    # Extract Python code
    if 'PYTHON:' in response_text:
        python_part = response_text.split('PYTHON:')[1]
        if 'SQL:' in python_part:
            python_part = python_part.split('SQL:')[0]
        if '```python' in python_part:
            python_part = python_part.split('```python')[1].split('```')[0]
        elif '```' in python_part:
            python_part = python_part.split('```')[1].split('```')[0]
        result['python'] = python_part.strip()
    elif '```python' in response_text:
        python_part = response_text.split('```python')[1].split('```')[0]
        result['python'] = python_part.strip()
    else:
        python_part = response_text
        for sql_marker in ['\nSQL:', '\nsql\n', '\n```sql', '\nSELECT ', '\nselect ']:
            if sql_marker in python_part:
                python_part = python_part.split(sql_marker)[0]
                break
        python_part = python_part.replace('```python', '').replace('```', '').strip()
        result['python'] = python_part

    # Extract SQL code
    if 'SQL:' in response_text:
        sql_part = response_text.split('SQL:')[1]
        if '```sql' in sql_part:
            sql_part = sql_part.split('```sql')[1].split('```')[0]
        elif '```' in sql_part:
            sql_part = sql_part.split('```')[1].split('```')[0]
        result['sql'] = sql_part.strip()
    elif '```sql' in response_text:
        sql_part = response_text.split('```sql')[1].split('```')[0]
        result['sql'] = sql_part.strip()

    return result


def modify_logic(current_logic: list, followup: str, df) -> list:
    """
    Modify existing logic based on a follow-up message.
    Returns updated logic list.
    """
    client = _get_client()

    all_columns = df.columns.tolist()

    current_logic_str = "\n".join(
        [f"- {col.get('Column', col.get('name', ''))}: {col.get('Logic', col.get('logic', ''))}"
         for col in current_logic]
    )

    system_prompt = f"""You are modifying an existing query logic based on user feedback.

CURRENT COLUMNS AND LOGIC:
{current_logic_str}

AVAILABLE DATAFRAME COLUMNS (use exact names): {all_columns}

COLUMN NAME MAPPINGS (user term → actual column name):
- "IVR cost" or "IVR spent" → use column 'IVR Cost'
- "WhatsApp cost" or "WA cost" → use column 'WhatsApp Cost'
- "IVR sent" or "IVR attempts" → use column 'IVR Sent count'
- "WhatsApp sent" → use column 'WhatsApp Sent count'
- "calls" or "attempts" → use column 'Call Sent count'
- "connects" → use column 'Call Contact' (derived flag: 1 if call connected)

USER REQUEST: {followup}

INSTRUCTIONS:
1. If user says "add X column" - ADD a new entry to the list with appropriate logic
2. If user says "remove X" - REMOVE that column from the list
3. If user says "change X to Y" - UPDATE the logic for that column
4. Keep all other columns unchanged

Return ONLY a valid JSON array with ALL columns (existing + any new ones):
[
  {{"Column": "column name", "Logic": "what to calculate"}},
  ...
]

IMPORTANT: Include ALL existing columns plus any new ones. Do not remove columns unless explicitly asked."""

    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Update the logic: {followup}"},
        ],
        temperature=0,
        max_tokens=2000,
    )

    response_text = response.choices[0].message.content.strip()
    response_text = _clean_json_response(response_text)

    return json.loads(response_text)
