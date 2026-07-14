# AimForge Desktop

Эта папка содержит desktop-обертку на `Tauri` для проекта `AimForge`.

Важно:

- интерфейс игры берется из соседней папки `../website`
- `exe-version` не хранит отдельную копию фронтенда
- при `tauri dev` и `tauri build` используются команды из `website`

## Команды

```bash
pnpm install
pnpm tauri dev
pnpm tauri build
```

## Windows сборка

Для выпуска настоящего `.exe` используйте workflow из корня репозитория:

- `.github/workflows/build-windows-exe.yml`
