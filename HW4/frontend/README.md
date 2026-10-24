# Campus Customs front end

Vite + React + TypeScript storefront for HW4. See `../README.md` to run the whole app and `../output/harness.md` for how it works.

```bash
npm install
npm run dev     # http://localhost:5174 (proxies /api and /media to the FastAPI backend on :8000)
npm run build   # type-check + production build
```

- `src/pages/`: Home, Products, ProductDetail, About, Login, Signup
- `src/components/`: NavBar, HeaderSearch, ProductCard, ChatWidget, ChatResults, BagDrawer, Brand (mascot, stamp, marquee), Footer
- `src/api.ts`: typed client for the backend; `authContext`, `chatContext`, `bagContext` hold app state
- `src/theme.css`: the storefront design system (Problem 10)
