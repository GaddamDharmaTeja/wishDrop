# WishDrop mobile app

WishDrop is an Expo SDK 57 mobile client with a Fastify + MongoDB API in [`server`](./server).

## Run account creation locally

1. Create `server/.env` from [`server/.env.example`](./server/.env.example). Use a MongoDB Atlas connection string (or local MongoDB) and a JWT secret of at least 32 characters.
2. In `server`, run `npm install`, then run `npm run dev` in one terminal and `npm run worker` in a second terminal.
3. Copy [`.env.example`](./.env.example) to `.env` and replace the IP address with this computer's Wi-Fi IPv4 address. Keep the phone and computer on the same network.
4. Start the mobile app with `npx expo start --clear`.

The old default `localhost` is valid only for an emulator. On a physical iPhone, it means the phone itself and causes the connection error shown in the screenshot.

## Remaining provider setup

Google/Apple OAuth, Expo Push, Cloudflare R2, and Mux/Cloudflare Stream are configured through deployment secrets. The app and API include their integration boundaries; add provider credentials before enabling each live service.

### Brand assets

Drop design exports into [`assets/brand`](./assets/brand) using the filenames in that folder’s README (`logo.png`, `welcome-hero.png`, `home-hero.png`, occasion art). Until files are present, screens use gradient/emoji placeholders.

### App flow (current)

- Welcome → email / social CTAs → Create account / Log in
- Home → occasions → Create (compose → settings → share sheet)
- Memories + Profile with bottom nav
- Public reveal at `/surprise/[token]` with unwrap intro

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
