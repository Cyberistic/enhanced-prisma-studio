# Enhanced Prisma Studio

## Problem Statement

The only way to access your DB should be internally through your server. DB strings shouldn't be exposed. The DB ITSELF shouldn't be exposed to the internet. Need to see your data? ssh into your machine. RLS sucks. Any DB level sucks. 

But.. that's like, just my opinion man. Good luck convincing clients they should ssh into their machines to see their data. This is where Prisma Studio comes in, I've grown to implement it in all my clients' projects because it provides a nice UI for exploring the database, running queries, and managing data. It's embedded directly into their app and the app's auth handles who has access.

Multiple projects exist today but they all have their pain points and do not, IMO, follow modern practices. Furthermore, they aren't open source, so we can't contribute to them directly or make our own fork. The only close canditate I've found is [premieroctet/next-admin](https://github.com/premieroctet/next-admin), but even that has its pain points and depends on prisma-json. Other projects include [drizzle-kit-studio](https://orm.drizzle.team/docs/drizzle-kit-studio), but that is a paid, B2B product and not open source.

## The shadcn-ification of Prisma Studio

The ui depends on:
1. lucide-react
2. radix-ui
3. motion-dom
4. framer-motion
5. reactflow
6. dnd-kit/core


The data layer depends on:
1. Kysely
2. nuqs

Utils depend on:
1. date-fns 
2. codemirror
3. @lezer/lr

amongst others.

My app is built on Hugeicons, base-ui, tanstack router search params, D3.. and it has its own styling. Why do I have to depend on other component libraries and styling solutions just to use the studio? Why can't I use the same component library and styling solution for the studio as I do for the rest of my app? just let me use my stuff man. Studio should live under @components and use the same styling and components as the rest of the app, and I should be able to gut it and change whatver I want. I never use the react-flow viewer, my machete shall chop chop as it wishes. The default install can stay the same, but community (or self-made) versions and patterns can exist. Eventually, a cli-command which just sees what you're using and tailors the install to your stack. *Yes, I blame shadcn for this, we're spoiled.*

Also, while it's true that tree-shaking is reducing the impact of these dependencies (for example, lucide-react (~3.0 MB) metafile shows only ~8 KB of Lucide code ends up in dist/ui/index.js), these extras quickly add up. Not only do they bloat the app and create UI inconsistencies, but also they reach size constraints of _some_ environments. In a recent project, Cloudflare workers had a hard limit of 3 MB for the entire app, and Prisma Studio alone taking around 1.1 MB.

> [!Note] 
> I haven't listed tanstack/db, tanstack/react-table, and tanstack/react-query because I'm biased and I consider them part of the core stack; your project should be using them anyways. 

## Goal
THe goal of this project is to create an enhanced version of Prisma Studio with additional features and improvements. 

https://www.npmjs.com/package/@prisma/studio-core

[x] Main focus is to first, deminimize and reverse engineer the package codebase and then add features iteratively. Initial snapshot and findings are in `research/studio-core-snapshot/`.

> [!Note]
> Prisma CEO personally replied to me and said prisma-studio-core will be going open-source! So hopefully this step won't be needed later.

Features include:
[ ] Instead of importing .css file (which causes problems, for example prisma studio overwriting the theme of the host application), we want to support shadcn and tailwind natively. 
    - Experimental route available at `/studio-new` with host-provided Studio theme and randomizer (`baseColor x theme`) inspired by shadcn create's theme merge flow.
    - `/studio-new` now runs without importing `@enhanced-prisma-studio/studio-core/ui/index.css` and relies on host Tailwind/shadcn tokens.
    - Randomizer now supports multiple accents including purple and emerald, plus radius presets.
    - Expanded base color palettes beyond grays (sky, emerald, rose, amber).

[ ] Use shadcn's components to buidl the ui, such that changing the styling affects the studio too.

[ ] Remove nuqs as a dependency; instead have it as one of the providers. For instance, in tanstack router, we don't need nuqs as we can use the router's own data fetching and mutation capabilities.


[ ] Remove Kysely as a dependency; instead have it as one of the providers. Allow users to choose their own query builder or ORM for the studio's internal operations. For example, can use Prisma, Drizzle (lol), Bun.sql, or any other query builder/ORM that supports the required operations; making the system extensible.

[ ] Have optional separate HTTP support for DB introspection, making it compatible with providers such as Cloudflare D1. See https://gist.github.com/Cyberistic/b3152599b6849022d5aae879cbdf45fa

[ ] Add robust error handling and test-suite. Compare gzipped size and performance with the original package.

[ ] Make anonymized telemetry optional.
    - Added anonymized telemetry via `VITE_PRISMA_TELEMETRY_DISABLED` (default enabled, set to `1` to disable).
    - Current telemetry payload is anonymized metadata only: source, event name, operation name (if present), and error flag.


## Important note

This is not supposed to replace Prisma studio, the team did a pretty good job building it. Hopefully, this POC can one day be considered by the team. I use Prisma in all my projects and these are the main "pain points" I have with the current studio. Hopefully Prisma will consider adding these features.


## Legal
This project is not affiliated with Prisma in any way. It is an independent project created as a POC. Prisma-studio-core is NOT an open-source package.
Embeddable Prisma Studio (Free) is licensed under Apache 2.0. The main condition for using the free, embeddable version in production is that the Prisma branding must stay visible. Commercial options are available for branding removal or premium features.
https://www.prisma.io/terms

prisma plz don't sue me thanks <3
