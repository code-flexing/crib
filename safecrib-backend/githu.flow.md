                 GitHub
                   │
                   │ push main
                   ▼
            ┌──────────────┐
            │ GitHub Action│
            │              │
            │ lint         │
            │ test         │
            │ build        │
            └──────┬───────┘
                   │
                   │
          ┌────────┴────────┐
          ▼                 ▼
       Render             Netlify
       Backend            Frontend
       auto-deploy        auto-deploy