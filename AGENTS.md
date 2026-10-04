<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep FinOps feature data local and typed so it can later be replaced by the planned C# API without changing presentation components.
- Treat the dashboard as a single responsive bento workspace; operational widgets own their temporary interactive state.
- AI features stream from server routes under src/routes/api with prompts and keys in *.server.ts — keeps secrets server-side.
