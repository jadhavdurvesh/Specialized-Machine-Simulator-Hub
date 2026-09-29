# Specialized Machine Simulator Hub

A static, Firebase Hosting-ready simulator hub for MAINTAIN AI specialized machine telemetry.

## Included
- CNC Machine
- Industrial Robot
- Lathe
- Milling Machine
- Drill Press
- Grinding Machine
- Hydraulic Press
- Injection Molding Machine
- Packaging Machine
- Generator
- Transformer
- Boiler

## Multi-machine simulation
Multiple instances can run concurrently. Each instance has independent configuration, state, history, and telemetry events. Use **Clone selected** or **Add machine instance** to create additional machines.

## Telemetry
The simulator emits machine-specific telemetry using stable machine IDs and timestamps and can export the complete telemetry history as JSON.

## Firebase Hosting
This is a dependency-free static site. Deploy with Firebase Hosting after configuring your Firebase project:

```bash
firebase login
firebase use <your-project-id>
firebase deploy --only hosting
```

`firebase.json` is already configured to serve the repository root.
