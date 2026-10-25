# Clataxis

## Run locally

Install dependencies and start a local server with:

```sh
npm ci
npm run dev
```

Open the local URL printed in the terminal. The command builds the app and
copies Monaco Editor's runtime into `build/site` before serving it.

To build the deployable site without starting the server, run:

```sh
npm run build
```

The complete static site is written to `build/site`. GitHub Pages deploys this
same directory from the workflow in `.github/workflows/main.yml`.