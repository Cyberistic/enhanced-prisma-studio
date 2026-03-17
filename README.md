# Enhanced Prisma Studio

## Demo Thread
https://x.com/Cyb3ristic/status/2033987249931436087


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
The goal of this project is to create an enhanced version of Prisma Studio with additional features and improvements. Mainly, we want it to be extremely composable. Easily swap icons, add/remove sections, change providers, etc.

https://www.npmjs.com/package/@prisma/studio-core

[x] Main focus is to first, deminimize and reverse engineer the package codebase and then add features iteratively. Initial snapshot and findings are in `research/studio-core-snapshot/`.

> [!Note]
> Prisma CEO personally replied to me and said prisma-studio-core will be going open-source! So hopefully this step won't be needed in the future and we can leverage the open-source version.

Features include:
[x] Instead of importing .css file (which causes problems, for example prisma studio overwriting the theme of the host application), we want to support shadcn and tailwind natively. 
    - `/studio-new` now runs without importing `@enhanced-prisma-studio/studio-core/ui/index.css` and relies on host Tailwind/shadcn tokens.
    - Prisma logo in Studio navigation now renders as inline SVG with `currentColor`, so it follows dark/light mode and active theme tokens.


[x] Use shadcn's components to build the ui, such that changing the styling affects the studio too.
    - [x] Replaced enhanced `/studio-new` shell and navigation controls to use host UI primitives (`button`, `input`, `select`, `sidebar`, `table`, `dropdown-menu`, `switch`).
    - [x] Localized Studio shell into app-owned components under `apps/web/src/components/prisma/**` (`studio.tsx`, `components/studio/*`, `utils/*`, `icons.tsx`) so UI can be edited without touching upstream package.
    - [x] Removed nested upstream Studio renderer from table mode; local table view now renders host table primitives and local header/footer controls.
    - [x] Added lightweight local table animations (row/color transitions and pinned-column left-position transitions) to partially cover upstream `motion/react` grid animation behavior.
    - [x] Finish shadcn parity for all views (`schema`, `console`, `sql`) with final spacing/interaction parity to upstream.
    - [x] Replace remaining custom/unified variants with host-safe variants only (remove unsupported badge/button variants and normalize tokens).
    - [x] Remove remaining direct UI fallbacks to upstream internals (only data/adapter layer should remain shared during migration).
    - [x] Remove motion-dom and framer-motion dependencies; instead use TailwindCSS. Replace custom sidebar implementation with shadcn's sidebar; which has built in support for transitions and animations. 

[x] Remove nuqs as a dependency; instead have it as one of the providers. For instance, in tanstack router, we don't need nuqs as we can use the router's own data fetching and mutation capabilities.
    - URL state is now provider-driven (`URLProvider` adapters) and hash/query synchronization is handled locally in `apps/web/src/components/prisma/components/studio/url-state.ts` + shell state effects, so TanStack Router integration no longer depends on `nuqs`.
    - Enhanced Studio route (`/studio-new`) uses app-owned URL/provider wiring instead of direct `nuqs` hooks, making router-specific behavior swappable via provider adapters.
    - Supporting other frameworks is easy: add a small adapter implementing the same `URLProvider` contract for framework-native APIs (for example Next.js router/`searchParams`) without changing Studio UI components.


[x] Remove Kysely as a dependency; instead have it as one of the providers. Allow users to choose their own query builder or ORM for the studio's internal operations. For example, can use Prisma, Drizzle (lol), Bun.sql, or any other query builder/ORM that supports the required operations; making the system extensible.
    - Adapter/provider architecture now supports pluggable backends without hard-coding Kysely into the Studio UI path.
    - Current provider implementations include Prisma raw, Drizzle, Bun SQL, Cloudflare D1, and Kysely-style support through adapter wrappers in `apps/web/src/components/prisma/providers/adapters/db/sqlite/*`.
    - Studio depends on the shared adapter contract (not a single ORM), so teams can swap query builders without changing Studio components.


[x] Make it composable and easy to add or remove components.
    - Studio views are composition-driven via `PrismaStudioContent`, `PrismaStudioSection` in `apps/web/src/components/prisma/components/prisma-studio-components.tsx`.
    - Sidebar/view wiring is generated from section definitions in `apps/web/src/components/prisma/components/studio/studio.tsx`, so adding or removing a view does not require rewriting core shell/navigation layout.
    - Example custom extension: Evil Stats view implementation in `apps/web/src/components/prisma/components/studio/views/evil-stats-view.tsx`.
    - Check `apps/web/src/components/prisma/studio-example.tsx` for how composable this system is.
    ```tsx
    		<PrismaStudio theme={theme}>
			<PrismaProviders>
				<URLProvider adapter={createNuqsPrismaAdapter()} />
				<AdapterProvider
					adapter={createSQLiteKyselyProvider({ executeStudioRequest })}
				/>
			</PrismaProviders>
			<PrismaStudioContent>
				<PrismaStudioSection>
					<PrismaStudioSectionHeader>
						<StudioSectionHeader />
					</PrismaStudioSectionHeader>
					<PrismaConsole />
					<PrismaSQL />
					<PrismaVisualizer />
					<PrismaEvilStats />
					<PrismaLogs />
				</PrismaStudioSection>

				<PrismaStudioSection>
					<PrismaStudioSectionHeader>
						<PrismaTablesSearchHeader />
					</PrismaStudioSectionHeader>
					<PrismaTables />
				</PrismaStudioSection>
			</PrismaStudioContent>
		</PrismaStudio>
    ```




[ ] Have optional separate HTTP support for DB introspection, making it compatible with providers such as Cloudflare D1. See https://gist.github.com/Cyberistic/b3152599b6849022d5aae879cbdf45fa



[ ] Add optional logging component which integrates with prisma logs (Under Studio in sidebar). Can be swapped out for other logging providers or custom implementations. https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/logging
    - This paired nicely with our existing custom components architechture, allowing us to add a custom `PrismaLogs` view which consumes logs from the shared adapter layer and renders them in a custom UI.
    

[ ] Add test-suite for testing the providers.

[ ] Compare gzipped size and performance with the original package.
    - **Current Build Sizes (Enhanced Version):**
      - Client bundle: 3.5M (uncompressed)
      - Server bundle: 1.0M (uncompressed)
      - Largest assets: studio (1.5M), studio-new (512K), main (400K)
    - **Original Source (studio-core-snapshot): 9.1M uncompressed**
    - Local implementation allows for tree-shaking and selective bundling of only used components, reducing final size compared to including the full upstream package.

[x] Add error boundaries to each view, and prevent hard crashes. Add refresh button to each view to recover from errors.

[x] Make anonymized telemetry optional.
    - Added anonymized telemetry via `VITE_PRISMA_TELEMETRY_DISABLED` (default enabled, set to `1` to disable).



## Important note

This is not supposed to replace Prisma studio, the team did a pretty good job building it. Hopefully, this POC can one day be considered by the team. I use Prisma in all my projects and these are the main "pain points" I have with the current studio. Hopefully Prisma will consider adding these features.


## Legal?

This project is not affiliated with Prisma in any way. It is an independent project created as a POC. Prisma-studio-core is NOT an open-source package.
Embeddable Prisma Studio (Free) is licensed under Apache 2.0. The main condition for using the free, embeddable version in production is that the Prisma branding must stay visible. Commercial options are available for branding removal or premium features.
https://www.prisma.io/terms

prisma plz don't sue me thanks <3
