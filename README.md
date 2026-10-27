♿ EquiDOM (Web Accessibility Auditor)

Automated WCAG auditing with instant, AI-generated code fixes.

Standard accessibility scanners like Google Lighthouse tell you what is broken and give you a cryptic error code. EquiDOM tells you why it's broken in plain English, and generates the exact, copy-pasteable HTML/CSS code required to fix it.

Built for high-velocity development, EquiDOM allows developers to paste a URL or raw HTML snippet, audit it against WCAG standards, apply AI-suggested fixes, and instantly re-score their page.

✨ Core Features

Dual-Input Auditing: Scan live URLs via headless browser rendering, or paste raw HTML snippets for instant, pre-deployment checks.

Zero False-Positive Engine: Powered by axe-core to ensure only objective WCAG violations are flagged.

AI Plain-Language Translations: Cryptic accessibility errors are passed through the Groq API to generate beginner-friendly explanations.

Actionable Code Generation: Stop reading docs. The AI generates precise, ready-to-use HTML/CSS patches for your exact broken DOM nodes.

The Re-Score Loop: Apply the suggested code fixes and re-run the scan to instantly visualize your accessibility score improvements.

High-Speed Caching: Built-in node-cache bypasses slow browser execution for recently scanned URLs, providing a lightning-fast experience.

🛠️ Tech Stack

Frontend: React, Vite, Tailwind CSS, Shadcn UI

Backend: Node.js, Express.js

Scanner Engine: Puppeteer, @axe-core/puppeteer

AI & Inference: Groq API (Llama 3)

Database & Caching: MongoDB, node-cache

🚀 Getting Started

Prerequisites

Node.js (v18+)

MongoDB instance (local or Atlas)

Groq API Key

Installation

Clone the repository

git clone https://github.com/yourusername/equidom.git
cd equidom


Setup Backend

cd backend
npm install


Create a .env file in the backend directory:

PORT=5000
MONGO_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key


Setup Frontend

cd ../frontend
npm install


Running the Application

Start the Express Server (from /backend)

npm run dev


Start the Vite Frontend (from /frontend)

npm run dev


Open http://localhost:5173 in your browser.

🧠 How it Works (Architecture)

The React frontend sends a target URL to the Express backend.

Express launches a headless Puppeteer instance to fully render the client-side JavaScript and DOM.

Axe-core is injected into the page, extracting a JSON tree of exact WCAG violations.

The heavily nested JSON is parsed and sent to the Groq API with a highly-tuned system prompt.

Groq streams back plain-language contexts and precise code fixes.

The entire dataset is saved to MongoDB and temporarily stored in node-cache before being returned to the user dashboard.