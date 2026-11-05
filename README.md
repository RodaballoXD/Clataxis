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

## Google Search (free)

The site includes `robots.txt`, `sitemap.xml`, and page metadata. After
deploying to Vercel, make sure the Vercel project publishes `build/site`, then:

1. Open [Google Search Console](https://search.google.com/search-console/) and
   add a **URL-prefix** property for `https://clataxis.vercel.app/`.
2. Verify ownership using the **HTML tag** method. Add the verification
   `<meta>` tag Google gives you inside the `<head>` in `src/index.html`, commit
   and deploy, then click **Verify** in Search Console.
3. In that property, open **Sitemaps**, submit `sitemap.xml`, and check that
   Google can fetch it.
4. Use **URL inspection** for `https://clataxis.vercel.app/` and select
   **Request indexing**. You can also inspect the sitemap and indexing status
   there.

These steps and Google Search Console are free. Indexing and ranking are
decided by Google and can take days or longer; submitting a sitemap or
requesting indexing does not guarantee that the site will appear for a
particular search. A free `vercel.app` address is fine to start with; a custom
domain is optional.