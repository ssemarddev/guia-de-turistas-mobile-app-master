

# Guía de Turistas — Setup y Compilación

Este proyecto usa Angular 10 e Ionic 5 con Capacitor 4. Para compilar correctamente, es importante usar versiones compatibles de Node y dependencias.

## Requisitos de versión
- **Node.js**: `14.x` (LTS recomendado). Angular CLI 10 no es compatible con Node 18+.
- **npm**: `6.x` o `7.x` (el que venga con Node 14 está bien).
- **Angular**: `@angular/core ~10.0.0`, `@angular/cli ^10.2.1` (ya definidos en `package.json`).
- **Ionic**: `@ionic/angular ^5.9.4`.
- **Capacitor**: `^4.x`.

## Configuración del entorno
1. Instalar y usar Node 14 con `nvm`:
   ```zsh
   # Instalar nvm (si no lo tienes)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | zsh
   export NVM_DIR="$HOME/.nvm"
   source "$NVM_DIR/nvm.sh"

   # Instalar y activar Node 14
   nvm install 14
   nvm use 14
   node -v
   npm -v
   ```

2. Instalar dependencias del proyecto:
   ```zsh
   cd "/Documents/GitHub/guia-de-turistas-mobile-app-master/guia-de-turistas-mobile-app-master"
   npm install
   ```

## Variables de entorno necesarias
Configura las llaves de Stripe en los archivos de entorno:
- `src/environments/environment.ts` (desarrollo)
- `src/environments/environment.prod.ts` (producción)

Campos requeridos (ejemplo):
```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  firebase: { /* ... */ },
  stripePublicKey: 'pk_test_XXXX',
  stripePaymentTokenUrl: 'http://localhost:3000/stripe/token'
};
```

## Ejecución en desarrollo
```zsh
npm start
# o
./node_modules/.bin/ng serve --host 0.0.0.0
```
Abre `http://localhost:4200` en el navegador.

## Compilación para producción (web)
```zsh
npm run build
# Genera la salida en la carpeta `www/`
```

## Uso con Capacitor (Android/iOS)
1. Sincronizar recursos nativos después de cambiar dependencias:
   ```zsh
   npx cap sync
   ```
2. Abrir proyecto nativo:
   ```zsh
   npx cap open ios
   npx cap open android
   ```

### Stripe en dispositivo
Si usas Stripe nativo con Ionic Native:
```zsh
npm install cordova-plugin-stripe @ionic-native/stripe
npx cap sync
```
Asegúrate de usar claves válidas y de que el backend en `stripePaymentTokenUrl` esté accesible.

## Limpieza de instalación (si hay errores)
Si aparece el error "Cannot find module '../lib/init'" u otros problemas de compatibilidad:
```zsh
nvm use 14
rm -rf node_modules package-lock.json
npm cache verify
npm install
npm start
```

## Notas
- Mantén Node en 14 para desarrollo de este proyecto.
- Si actualizas Angular/CLI, revisa primero compatibilidades con Node y Capacitor.

## License

This project is licensed under the [MIT License](LICENSE.md) - see the LICENSE.md file for details.


