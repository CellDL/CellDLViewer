# Prerequisites

- [Node.js](https://nodejs.org/) (version 22+);
- [npm](https://npmjs.com/) (it comes with Node.js); and
- [bun](https://bun.com/package-manager) (for package management).

## Installation

1. **Install Node.js and npm from [here](https://nodejs.org/en/download/package-manager);** and
2. **Install bun globally:**

```bash
npm install -g bun
```

# Getting Started

1. **Install the package's dependencies:**

   ```bash
   bun install
   ```

2. **Start the development server:**

   ```bash
   bun dev
   ```

3. **Test the package:**

   Open your browser and navigate to the local development URL (typically http://localhost:5173).

# Available Scripts

| Script         | Description                                                     |
| -------------- | ----------------------------------------------------------------|
| `build`        | Build the CellDL Editor's Web app                               |
| `build:lib`    | Build the CellDL Editor's Web app as a library for npm publishing |
| `clean`        | Clean the CellDL Editor's environment                           |
| `dev`          | (Build and) start the CellDL Editor's Web app with hot reload   |
| `format`       | Format the code using                                           |
| `format:check` | Check code formatting without making changes                    |
| `lint`         | Lint and automatically fix issues                               |
| `start`        | (Build and) start (the production version of) the CellDL Editor's Web app |
| `version:new`  | Update the version of the CellDL Editor                         |
