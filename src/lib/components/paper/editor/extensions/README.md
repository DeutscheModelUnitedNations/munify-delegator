# Structure

1. **`doc`**: The root.
   - _Content_: `resolutionHeader preambleSection operativeSection`
2. **`resolutionHeader`**: A locked block (or just visually rendered via Svelte) containing the pre-filled info.
3. **`preambleSection`**: The container for preambles.
   - _Content_: `preambleClause+` (Must have at least one).
4. **`preambleClause`**: A single point in the preamble.
   - _Content_: `text*` (Keep it simple, usually just italics/bold).
5. **`operativeSection`**: The container for the main action.
   - _Content_: `operativeClause+`
6. **`operativeClause`**: The numbered list items.
   - _Content_: `paragraph subClauseGroup?` (Allows text, followed optionally by children).
7. **`subClauseGroup`**: A wrapper for nested lists (crucial for indentation).
   - _Content_: `subClause+`
8. **`subClause`**: The 'a.', 'b.' items.
   - _Content_: `paragraph subClauseGroup?` (This `?` allows the infinite nesting you mentioned).
