# AimForge Workspace

Репозиторий разделен на три части:

- `website` — браузерная версия aim trainer на `Vite + React + three.js`
- `exe-version` — desktop-обертка на `Tauri`, которая использует сборку из `website`
- `installers` — готовые установщики и собранные desktop-артефакты

## `website`

Тут лежит основная версия проекта:

- меню и настройки
- 3D-тренировка
- конвертация сенсы
- статистика и рекомендации
- встроенная музыка и пользовательские `mp3`

Локальный запуск сайта:

```bash
cd website
./run-local.command
```

## `exe-version`

Тут лежит desktop-проект на `Tauri`.

Локальный запуск desktop-версии:

```bash
cd exe-version
pnpm install
pnpm tauri dev
```

Локальная сборка desktop-приложения:

```bash
cd exe-version
pnpm build
```

## `installers`

В этой папке лежат собранные установщики:

- `installers/macos-arm` — готовая версия для `macOS Apple Silicon`
- `installers/windows` — папка для Windows-установщика

Версии для `macOS Intel` сейчас нет и она не поддерживается.

## Windows `.exe`

Windows-установщик надежнее собирать на Windows. Для этого в репозитории добавлен workflow:

- `.github/workflows/build-windows-exe.yml`

Он собирает `website`, затем упаковывает `exe-version` и загружает готовые Windows-артефакты.
