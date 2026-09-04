<p align="center">
  <img src="docs/assets/logo-blue.svg" width="160" alt="DFIR Tools AIO logo">
</p>

<h1 align="center">DFIR Tools AIO</h1>

DFIR Tools AIO is a Windows-first desktop console for organizing forensic tools, creating case workspaces, and launching approved utilities from one consistent interface.

Validate collection and processing workflows in a lab before using them with
production evidence.

## What it does

- Groups forensic tools by workflow and capability.
- Creates an active case with dedicated `EVIDENCE` and `OUTPUT` directories.
- Opens CLI tools in their own directory with active-case path variables available in that console.
- Routes tool output into the active case structure when the tool supports an output path.
- Requests UAC only for tools registered as requiring administrator access.
- Protects memory acquisition behind an explicit safety guide and confirmation.
- Verifies registered executables before launch.
- Keeps the application local; it does not upload case content.

## Case layout

The default workspace is rooted at `C:\DFIR` and uses this structure:

```text
C:\DFIR\
|-- Tools\
`-- Cases\
    `-- <case-id>\
        |-- EVIDENCE\
        `-- OUTPUT\
            `-- <tool-name>\
```

CLI sessions expose these process-scoped variables:

```text
DFIR_CASE
DFIR_EVIDENCE
DFIR_OUTPUT
```

They exist only in the console opened by DFIR Tools AIO. The application does not add them to the global Windows environment.

## Tool installation

Third-party forensic tools are **not** stored in this repository. Use each tool's **Manage** menu to open its official download page, then place it at the registered path shown in the application. This keeps licensing decisions and tool provenance with the analyst.

The tool registry is maintained in [`config/tools.yaml`](config/tools.yaml). Known executable hashes are stored in [`config/tool-hashes.json`](config/tool-hashes.json).

## Technology

- Tauri 2 and Rust for the native Windows application and restricted launch boundary
- React and TypeScript for the interface
- Vite and Tailwind CSS for frontend development

The frontend invokes named Tauri commands through `src/services/tauri.ts`. Native launch behavior validates registered tool identifiers and does not expose a general-purpose command execution endpoint.

## Development setup

Install:

- Node.js with npm
- Rust using the MSVC toolchain
- Microsoft C++ Build Tools
- WebView2 Runtime

Then run:

```powershell
npm.cmd ci
npm.cmd run tauri dev
```

## Validation

Run the frontend production build and Rust compile check:

```powershell
npm.cmd run build
cargo check --manifest-path src-tauri/Cargo.toml
```

Build the Windows application with:

```powershell
npm.cmd run tauri build
```

Generated binaries, downloaded tools, cases, evidence, output, and local settings are excluded from version control.

## Evidence handling

Do not use the application as the only copy of case data or evidence. Preserve
original evidence separately and verify tool output before relying on it.

Third-party tools keep their own licenses and must be downloaded from their official sources.
