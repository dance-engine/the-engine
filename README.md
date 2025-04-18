# Dance Engine Mono-repo

## Structure

# Dance Engine Tech Stack
- NextJS 
- Vercel for deployment
- PNPM for package managment
- eslint and typescript to check types
- zod for valdiation
- Clerk for use management
- Serverless for deployment in eu-west-1
- Using tailwind v4 for styling

### Structure:
Turbo Repo with the following packages structure
All lambda functions sit behind an authoriser function that return IAM policies

    @the-engine/
    │── apps/
    │   │── core/
    │   │   │── {admin for clients}
    │   │── clients/ 
    │   │   │── {client websites}
    |── aws/s3 
    |   |── { files copied to config bucket }  
    │── functions/
    │   │── {Holds a serverless setup with python 3.11 for lambdas}
    │   │── _layers/:
    │   │   │──  {Lambda python layers}
    │── packages/
    │   │── ui/
    │   │   │── {various resuable react components}
    │   │── utils/
    │   │   │── {Cross package utilties}
    │   │── schemas/
    │   │   │── {zod schemas}

## TODO

- Add ENV var for cloudfront distribution in serverless

### Apps and Packages

- `@the-engine/ui`: a stub React component library shared by both `web` and `docs` applications
- `@the-engine/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@the-engine/typescript-config`: `tsconfig.json`s used throughout the monorepo

## Config

We can build a templated setup using themes and apply to client sites
https://medium.com/@philippbtrentmann/setting-up-tailwind-css-v4-in-a-turbo-monorepo-7688f3193039 

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Gitmoji
⚡️ Lets use Gitmoji 

---

# Original README

# Turborepo starter

This Turborepo starter is maintained by the Turborepo core team.

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `@dance-engine/ui`: a stub React component library shared by both `web` and `docs` applications
- `@dance-engine/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@dance-engine/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
cd my-turborepo
pnpm build
```

### Develop

To develop all apps and packages, run the following command:

```
cd my-turborepo
pnpm dev
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

```
cd my-turborepo
npx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
npx turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)
