# App

## Gerando o APK e instalando no celular

### Pré-requisitos

- [Android Studio](https://developer.android.com/studio) instalado (inclui o Android SDK e o ADB)

---

### Passo 1 — Gerar o APK

```bash
npx expo run:android --variant release
```

O APK gerado fica em:

```
android/app/build/outputs/apk/release/app-release.apk
```

---

### Passo 2 — Instalar no celular via ADB

Com o celular conectado via USB e a **depuração USB** habilitada:

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

Após a instalação, o USB pode ser desconectado. O app roda normalmente sem precisar do Metro Bundler.
