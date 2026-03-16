# enhanced-prisma-studio

THe goal of this project is to create an enhanced version of Prisma Studio with additional features and improvements. 

https://www.npmjs.com/package/@prisma/studio-core

[ ] Main focus is to first, deminimize and reverse engineer the package codebase and then add features iteratively.

Features include:
[ ] Instead of importing .css file (which causes problems, for example prisma studio overwriting the theme of the host application), we want to support shadcn natively. 

[ ] Use shadcn's components to buidl the ui, such that changing the styling affects the studio too.

[ ] Make nuqs optional and tree-shakeable. For instance, in tanstack router, we don't need nuqs as we can use the router's own data fetching and mutation capabilities.


[ ] Make Kysely optional, and allow users to choose their own query builder or ORM for the studio's internal operations.

[ ] Have optional separate HTTP support for DB introspection, making it compatible with providers such as Cloudflare D1. See https://gist.github.com/Cyberistic/b3152599b6849022d5aae879cbdf45fa

[ ] Add robust error handling and test-suite.

[ ] Make anonymized telemetry optional.


## Important note

This is not supposed to replace Prisma studio, the team did a pretty good job building it. Hopefully, this POC can one day be considered by the team. I use Prisma in all my projects and these are the main "pain points" I have with the current studio. Hopefully Prisma will consider adding these features.


## Legal
This project is not affiliated with Prisma in any way. It is an independent project created as a POC. Prisma-studio-core is NOT an open-source package.
Embeddable Prisma Studio (Free) is licensed under Apache 2.0. The main condition for using the free, embeddable version in production is that the Prisma branding must stay visible. Commercial options are available for branding removal or premium features.
https://www.prisma.io/terms

prisma plz don't sue me thanks <3
