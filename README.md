# Distributed Web Search Engine — Frontend

A React and TypeScript interface for crawling public pages, tracking crawl progress, and searching the shared index. The app uses Material UI, Chart.js, and Axios.

[Live demo](https://esearchengine.vercel.app/) · [Backend repository](https://github.com/elad9219/searchengine)

## Try the demo

1. Paste `https://www.scrapethissite.com/pages/simple/` into **Website URL**.
2. For a short demo crawl, open **Advanced** and set **Max URLs** to `1`.
3. Select **Start Crawl** and wait for the status panel to show that the crawl has finished.
4. Search for `Andorra` to see the matching page and highlighted text.

Search covers pages indexed by the demo, including earlier crawls. You can stop an active crawl from its status panel. If the demo reaches its shared crawl-start limit, wait a minute before trying again.

| Crawl setting | Range | Default |
| --- | --- | --- |
| Max seconds | 1–120 | 60 |
| Max crawl depth | 0–4 | 2 |
| Max URLs | 1–100 | 25 |

A depth of `0` attempts only the starting page.

## Search results example

![Search results in the web interface](https://github.com/user-attachments/assets/3dbdac2b-77a8-4499-9ba5-db216aa24489)

## Run locally

You need Node.js and npm. First start the API and its dependencies using the [backend setup instructions](https://github.com/elad9219/searchengine#run-locally). Then run these commands from the frontend repository root.

```bash
npm ci
npm start
```

Open [http://localhost:3000](http://localhost:3000). The development build reaches the API using the current browser hostname on port `8080`. The production build uses the hosted API configured in [`src/utils/globals.ts`](src/utils/globals.ts).

## Hosted backend warm-up

On page load, the production build sends a background health check to the hosted API. The waiting message appears when an active user request enters the retry flow. Before a write request, the client checks backend readiness and sends the write at most once.

## Tests and build

```bash
CI=true npm test -- --watchAll=false --runInBand
CI=true npm run build
```

The tests cover crawl input validation, progress and stop controls, search results and error states, and the API client's warm-up and retry behavior. The production build is generated in `build/`.

## Contact

Elad Tennenboim · [Portfolio](https://eladt-portfolio.vercel.app/) · [GitHub](https://github.com/elad9219) · [LinkedIn](https://www.linkedin.com/in/elad-tennenboim/) · [Email](mailto:elad9219@gmail.com)