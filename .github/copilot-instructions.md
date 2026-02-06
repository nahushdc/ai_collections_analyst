# Copilot / AI Agent Instructions — Collection Whisperer

Quick, actionable notes for an AI coding agent working in this repo.

1) Big picture
- This repo has two parallel surfaces: a Streamlit LLM-driven query app (`app.py`) and a React/Tailwind dashboard under `UI/`.
- `app.py` is the runtime entry for the Python app; it loads a CSV/Excel, builds a system prompt and asks an LLM for pandas code, then executes that code and displays results in Streamlit.

2) How to run locally
- Python backend (Streamlit):
  - Install: `pip install -r requirements.txt`
  - Run: `streamlit run app.py`
- Frontend (optional, in `UI/`):
  - Follow `UI/IMPLEMENTATION_GUIDE.md` — install with `npm install`, then `npm start`.

3) Critical developer contracts (do NOT change without updating tests/docs)
- LLM contract (see `build_system_prompt` in `app.py`): the model must return ONLY executable pandas code that creates a DataFrame named `result`.
- Column renames and outputs expected by UI and tests:
  - Always map `POS` → `AUM` in outputs.
  - Always map `Collected Amount` → `MTD Collection` in outputs.
  - Grouped results MUST include a "Grand Total" row appended as the final row.
- Execution harness: `execute_pandas_code(code, df)` runs the returned code in a restricted namespace (only `df`, `pd`, `datetime` available). Generated code must not rely on other imports.

4) Data processing conventions (follow these examples in `load_and_process_data`)
- Date detection: columns with `date` (case-insensitive) are coerced with `pd.to_datetime(..., errors='coerce')`.
- String cleanup: newline and carriage returns are replaced in object columns before use.
- Derived fields added in-place: `Collected Amount`, `POS`, `Conversion Rate`, `POS Band` (see function for exact bands).

5) Security & secrets
- `app.py` currently contains a hard-coded OpenAI API key and an absolute data file path — do NOT commit secrets. Use environment variables (`OPENAI_API_KEY`, configurable `DATA_FILE`) and update `app.py` to read from `os.environ`.

6) Patterns and conventions to follow when editing
- Keep `build_system_prompt()` rules intact unless you update the consumer (the LLM + `execute_pandas_code`). Many UI behaviors depend on these exact names/rounding rules.
- When changing numeric aggregation behaviour, preserve rounding to 2 decimals for rates and ensure Grand Total recomputes rates from totals.
- Maintain `@st.cache_data` on heavy data loaders to avoid slow reloads during dev.

7) Files worth referencing
- Streamlit app: [app.py](app.py)
- Python deps: [requirements.txt](requirements.txt)
- React UI and design notes: [UI/IMPLEMENTATION_GUIDE.md](UI/IMPLEMENTATION_GUIDE.md) and [UI/ENHANCED_FEATURES_GUIDE.md](UI/ENHANCED_FEATURES_GUIDE.md)
- Dashboard component: [UI/collections_dashboard_final.jsx](UI/collections_dashboard_final.jsx)

8) Debugging tips
- To reproduce LLM behavior locally: run `streamlit run app.py` with a small sample CSV and inspect the `system_prompt` produced by `build_system_prompt`.
- If generated code raises "no 'result' DataFrame", inspect returned code for extraneous text (app expects code only). The code sanitizer removes markdown fences but not arbitrary prints.

9) When to ask the human
- If you need to change the LLM contract (column names, required aggregate rows), ask before modifying `build_system_prompt` or `execute_pandas_code`.
- If a change introduces any secret (API key, tokens) in the code, stop and request secure secret storage instructions.

Please review these instructions and tell me which sections need more detail or examples from specific files.
