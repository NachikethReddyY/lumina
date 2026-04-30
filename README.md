# React Node.js Dashboard Project

This project is a full-stack application featuring a React-based user dashboard and a Node.js backend.

## External stuff used

### code-review-graph
I have installed **code-review-graph** to provide AI agents with a powerful, graphical way to understand and interact with the codebase.

*   **What it is:** A semantic knowledge graph that maps the entire project's structure, including functions, classes, imports, and their relationships.
*   **How it affects AI agents:** It significantly reduces the number of tokens required for an AI to "understand" the code. Instead of reading full files or performing broad text searches, the agent can query the graph for specific structural information.
*   **What it does:**
    *   **Structural Context:** Instantly identifies callers, dependents, and dependencies of any code element.
    *   **Impact Analysis:** Allows agents to calculate the "impact radius" or "blast radius" of a change before it's made.
    *   **Efficiency:** Provides token-efficient source snippets and context for code reviews.
    *   **Architecture Mapping:** Offers high-level overviews of the system's architecture and identifies communities within the code.
    *   **Automatic Updates:** The graph stays in sync with the codebase as changes are made.

### Axios
The project uses **Axios** (v1.15.2+) as the primary HTTP client for the frontend.

*   **What it is:** A promise-based HTTP client for the browser and Node.js.
*   **What it does:** It handles all communication between the React dashboard and the backend API. It is used to perform asynchronous requests to fetch, create, update, and delete user data, while providing a clean and consistent API for handling request/response headers, interceptors, and error management.
