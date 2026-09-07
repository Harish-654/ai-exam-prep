# AI Exam Prep

An AI-powered exam preparation agent that transforms study material into
a structured, time-aware learning plan.

The application takes an image of study material from the user, analyzes
the content, estimates how it can be studied within the available time,
and generates a detailed study prompt and learning plan. The material is
automatically divided into manageable modules and topics to make
preparation more structured and efficient.

## Features

-   Image-based input for uploading study material
-   AI-powered analysis of uploaded content
-   Time-aware study planning
-   Automatic splitting of content into modules
-   Detailed study prompts for each topic
-   Structured exam preparation workflow

## Project Structure

``` text
ai-exam-prep/
├── client/              # Frontend application
├── server/              # Backend/server
├── python/              # Python components
│   └── requirements.txt # Python dependencies
├── uploads/             # Uploaded files/images
├── package.json
├── package-lock.json
├── .env.example         # Environment variable template
└── README.md
```

## Prerequisites

Make sure the following are installed:

-   Node.js (LTS recommended)
-   npm
-   Python 3
-   pip
-   Git

Verify the installations:

``` bash
node --version
npm --version
python3 --version
pip --version
```

## Installation

### 1. Clone the repository

``` bash
git clone <repository-url>
cd ai-exam-prep
```

### 2. Install Node.js dependencies

From the project root:

``` bash
npm install
```

### 3. Install Python dependencies

The Python dependencies are listed in `python/requirements.txt`.

``` bash
pip install -r python/requirements.txt
```

For a cleaner development setup, using a virtual environment is
recommended:

``` bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r python/requirements.txt
```

On Windows:

``` powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r python\requirements.txt
```

### 4. Configure environment variables

The repository includes an `.env.example` file.

Create your local environment file:

``` bash
cp .env.example .env
```

Open `.env` and provide the required configuration values.

Do not commit `.env` or any API keys and secrets to the repository.

## Running the Application

The client and server are started separately.

### Start the server

From the project root:

``` bash
npm run dev
```

### Start the client

Open a second terminal, navigate to the project directory, and run:

``` bash
npm run dev:client
```

Both processes should be running simultaneously:

``` bash
# Terminal 1
npm run dev
```

``` bash
# Terminal 2
npm run dev:client
```

After starting the client, open the local URL shown in the terminal.

## How It Works

The application follows this general workflow:

``` text
Study Material Image
        |
        v
   AI Analysis
        |
        v
  Topic Extraction
        |
        v
  Module Creation
        |
        v
  Time Allocation
        |
        v
 Detailed Study Prompt
        |
        v
 Structured Study Plan
```

The uploaded image is analyzed to identify the relevant study material.
The system then breaks the material into modules and allocates study
time across them. Finally, it generates detailed prompts and
instructions to guide the user's preparation.

## Python Dependencies

Python-specific dependencies are maintained in:

``` text
python/requirements.txt
```

Install them from the project root with:

``` bash
pip install -r python/requirements.txt
```

## Environment Variables

Use `.env.example` as the template for the required environment
variables:

``` bash
cp .env.example .env
```

Configure the values in `.env` before running the application.

Sensitive values such as API keys should never be committed to version
control.

## Troubleshooting

### Node.js dependencies are missing

Run:

``` bash
npm install
```

### Python dependencies are missing

Run:

``` bash
pip install -r python/requirements.txt
```

### Environment variable errors

Make sure `.env` exists and contains all required values:

``` bash
cp .env.example .env
```

### Server or client does not start

Make sure both development processes are running in separate terminals:

``` bash
npm run dev
```

and:

``` bash
npm run dev:client
```

If a port is already in use, stop the process occupying the port or
configure the application to use another available port.

## Development

During development, keep the server and client running in separate
terminals.

Server:

``` bash
npm run dev
```

Client:

``` bash
npm run dev:client
```

## License

Add the project's license information here if applicable.

